const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { parseBody, isValidUuid } = require("../utils/validation");
const { verifyLegacyOwnership } = require("../utils/authorization");
const { BedrockService } = require("../services/bedrock");
const { buildLegacyContext } = require("../services/context-builder");
const { getToolDefinitions } = require("../services/tool-definitions");
const { ToolExecutor } = require("../services/tool-executor");

const MESSAGE_LIMIT = 8000;
const MAX_TOOL_ROUNDS = 5;
const CONVERSATION_HISTORY_LIMIT = 20;
const DEFAULT_AGENT_MAX_TOKENS = Number.parseInt(
  process.env.BEDROCK_AGENT_MAX_TOKENS || "600",
  10
);

const toContentBlocks = (content) => {
  if (Array.isArray(content)) {
    return content;
  }
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  if (content === null || content === undefined) {
    return [{ type: "text", text: "" }];
  }
  return [{ type: "text", text: JSON.stringify(content) }];
};

const validateMessage = (message) => {
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return "message is required";
  }
  if (message.length > MESSAGE_LIMIT) {
    return `message must be ${MESSAGE_LIMIT} characters or fewer`;
  }
  return null;
};

const getConversation = async (origin, userId, legacyId, queryParams = {}) => {
  if (!isValidUuid(legacyId)) {
    return buildResponse(400, { error: "legacyId must be a valid UUID" }, origin);
  }

  if (!(await verifyLegacyOwnership(legacyId, userId))) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  const conversationId = queryParams.conversation_id;
  if (conversationId && !isValidUuid(conversationId)) {
    return buildResponse(400, { error: "conversation_id must be a valid UUID" }, origin);
  }

  const pool = await getPool();
  let conversationResult;

  if (conversationId) {
    conversationResult = await pool.query(
      `SELECT conversation_id, legacy_id, user_id, created_at, updated_at
       FROM conversations
       WHERE conversation_id = $1 AND legacy_id = $2 AND user_id = $3`,
      [conversationId, legacyId, userId]
    );
  } else {
    conversationResult = await pool.query(
      `SELECT conversation_id, legacy_id, user_id, created_at, updated_at
       FROM conversations
       WHERE legacy_id = $1 AND user_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [legacyId, userId]
    );
  }

  if (conversationResult.rows.length === 0) {
    return buildResponse(200, { conversation: null, messages: [] }, origin);
  }

  const conversation = conversationResult.rows[0];

  const messagesResult = await pool.query(
    `SELECT message_id, role, content, input_tokens, output_tokens, tool_calls, created_at
     FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversation.conversation_id]
  );

  return buildResponse(
    200,
    {
      conversation,
      messages: messagesResult.rows,
    },
    origin
  );
};

const deleteConversation = async (origin, userId, legacyId, queryParams = {}) => {
  if (!isValidUuid(legacyId)) {
    return buildResponse(400, { error: "legacyId must be a valid UUID" }, origin);
  }

  if (!(await verifyLegacyOwnership(legacyId, userId))) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  const conversationId = queryParams.conversation_id;
  if (conversationId && !isValidUuid(conversationId)) {
    return buildResponse(400, { error: "conversation_id must be a valid UUID" }, origin);
  }

  const pool = await getPool();
  let targetId = conversationId;

  if (!targetId) {
    const latest = await pool.query(
      `SELECT conversation_id
       FROM conversations
       WHERE legacy_id = $1 AND user_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [legacyId, userId]
    );
    if (latest.rows.length === 0) {
      return buildResponse(200, { deleted: false, message: "No conversation to delete" }, origin);
    }
    targetId = latest.rows[0].conversation_id;
  }

  const result = await pool.query(
    `DELETE FROM conversations
     WHERE conversation_id = $1 AND legacy_id = $2 AND user_id = $3`,
    [targetId, legacyId, userId]
  );

  return buildResponse(200, { deleted: result.rowCount > 0 }, origin);
};

const chatWithAgent = async (origin, userId, body) => {
  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { legacy_id, conversation_id, message } = parsed;

  if (!legacy_id || !isValidUuid(legacy_id)) {
    return buildResponse(400, { error: "legacy_id is required and must be a valid UUID" }, origin);
  }

  if (conversation_id && !isValidUuid(conversation_id)) {
    return buildResponse(400, { error: "conversation_id must be a valid UUID" }, origin);
  }

  const messageError = validateMessage(message);
  if (messageError) {
    return buildResponse(400, { error: messageError }, origin);
  }

  if (!(await verifyLegacyOwnership(legacy_id, userId))) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  const pool = await getPool();
  let conversationId = conversation_id;

  // Get or create conversation
  if (conversationId) {
    const existing = await pool.query(
      `SELECT conversation_id
       FROM conversations
       WHERE conversation_id = $1 AND legacy_id = $2 AND user_id = $3`,
      [conversationId, legacy_id, userId]
    );
    if (existing.rows.length === 0) {
      return buildResponse(404, { error: "Conversation not found" }, origin);
    }
  } else {
    const conversationResult = await pool.query(
      `INSERT INTO conversations (legacy_id, user_id)
       VALUES ($1, $2)
       RETURNING conversation_id`,
      [legacy_id, userId]
    );
    conversationId = conversationResult.rows[0].conversation_id;
  }

  // Save user message
  await pool.query(
    `INSERT INTO messages (conversation_id, role, content)
     VALUES ($1, 'user', $2)`,
    [conversationId, message.trim()]
  );

  await pool.query(
    `UPDATE conversations
     SET updated_at = NOW()
     WHERE conversation_id = $1`,
    [conversationId]
  );

  // Build legacy context
  const contextResult = await buildLegacyContext(legacy_id, userId);
  if (!contextResult) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  // Load conversation history for Bedrock
  const historyResult = await pool.query(
    `SELECT role, content
     FROM (
       SELECT role, content, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) recent_messages
     ORDER BY created_at ASC`,
    [conversationId, CONVERSATION_HISTORY_LIMIT]
  );

  const bedrockMessages = historyResult.rows.map((row) => ({
    role: row.role,
    content: toContentBlocks(row.content),
  }));

  // Initialize Bedrock and tools
  const bedrock = new BedrockService();
  const toolDefs = getToolDefinitions();
  const toolExecutor = new ToolExecutor(legacy_id, userId);
  const systemPrompt = bedrock.buildSystemPrompt(
    contextResult.systemPrompt,
    contextResult.contextText
  );

  // First Bedrock call with tools
  let response = await bedrock.invokeWithTools({
    messages: bedrockMessages,
    system: systemPrompt,
    tools: toolDefs,
    maxTokens: DEFAULT_AGENT_MAX_TOKENS,
  });

  if (!response.content || response.content.length === 0) {
    const lastUserMessage = [...bedrockMessages].reverse().find((msg) => msg.role === "user");
    if (lastUserMessage) {
      console.warn("Empty Bedrock response; retrying with last user message only");
      response = await bedrock.invokeWithTools({
        messages: [lastUserMessage],
        system: systemPrompt,
        tools: toolDefs,
        maxTokens: DEFAULT_AGENT_MAX_TOKENS,
      });
    }
  }

  let totalInputTokens = response.inputTokens;
  let totalOutputTokens = response.outputTokens;
  const allToolCalls = [];
  const preToolTextBlocks = [];
  let round = 0;

  const hasToolUseBlocks = (content = []) =>
    Array.isArray(content) && content.some((block) => block.type === "tool_use");
  const textFromBlocks = (content = []) =>
    content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

  const lastUserMessage = [...bedrockMessages].reverse().find((msg) => msg.role === "user");
  const lastUserText = lastUserMessage ? textFromBlocks(lastUserMessage.content) : "";
  const lastUserAskedQuestion = /\?/.test(lastUserText);

  // Multi-turn tool use loop (handle tool_use blocks even if stop_reason is unexpected)
  while (
    (response.stopReason === "tool_use" || hasToolUseBlocks(response.content)) &&
    round < MAX_TOOL_ROUNDS
  ) {
    round++;

    if (lastUserAskedQuestion && preToolTextBlocks.length === 0) {
      const answerOnly = await bedrock.invokeWithTools({
        messages: bedrockMessages,
        system: systemPrompt,
        tools: [],
        maxTokens: DEFAULT_AGENT_MAX_TOKENS,
      });
      totalInputTokens += answerOnly.inputTokens;
      totalOutputTokens += answerOnly.outputTokens;
      const answerText = textFromBlocks(answerOnly.content).trim();
      if (answerText) {
        preToolTextBlocks.push(answerText);
        bedrockMessages.push({ role: "assistant", content: answerOnly.content });
      }
    }

    // Capture any text before tool use so it can be surfaced to the user
    if (lastUserAskedQuestion) {
      const toolRoundText = response.content
        .filter((block) => block.type === "text" && block.text?.trim())
        .map((block) => block.text.trim())
        .join(" ");
      if (toolRoundText) {
        preToolTextBlocks.push(toolRoundText);
      }
    }

    // Append assistant response (with tool_use blocks) to messages
    bedrockMessages.push({ role: "assistant", content: response.content });

    // Execute each tool call in the response
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await toolExecutor.execute(block.name, block.input);
        allToolCalls.push({
          name: block.name,
          input: block.input,
          result,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Append tool results as user message
    bedrockMessages.push({ role: "user", content: toolResults });

    // Call Bedrock again with updated conversation
    response = await bedrock.invokeWithTools({
      messages: bedrockMessages,
      system: systemPrompt,
      tools: toolDefs,
      maxTokens: DEFAULT_AGENT_MAX_TOKENS,
    });

    totalInputTokens += response.inputTokens;
    totalOutputTokens += response.outputTokens;
  }

  // Extract final text response
  let finalText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const preToolText = preToolTextBlocks.join(" ").trim();
  if (preToolText && !finalText.includes(preToolText)) {
    finalText = `${preToolText} ${finalText}`.trim();
  }

  const limitToThreeSentences = (text, shouldAskFollowUp) => {
    if (!text) return text;
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) || [];
    if (sentences.length === 0) return text.trim();
    let limited = sentences.slice(0, 3);
    const hasQuestion = limited.some((sentence) => sentence.endsWith("?"));
    if (shouldAskFollowUp && !hasQuestion) {
      limited.push("Anything else you'd like to update?");
    }
    return limited.join(" ");
  };
  finalText = limitToThreeSentences(finalText, allToolCalls.length > 0);
  if (!finalText || finalText.trim().length === 0) {
    console.warn("Agent response had no text blocks", {
      stopReason: response.stopReason,
      content: response.content,
    });
    finalText =
      "I received your message, but I couldn't generate a readable response. " +
      "Please try again or rephrase your request.";
  }

  // Save assistant response with tool call metadata
  await pool.query(
    `INSERT INTO messages (conversation_id, role, content, input_tokens, output_tokens, tool_calls)
     VALUES ($1, 'assistant', $2, $3, $4, $5)`,
    [
      conversationId,
      finalText,
      totalInputTokens,
      totalOutputTokens,
      allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null,
    ]
  );

  await pool.query(
    `UPDATE conversations
     SET updated_at = NOW()
     WHERE conversation_id = $1`,
    [conversationId]
  );

  return buildResponse(
    200,
    {
      conversation_id: conversationId,
      reply: {
        role: "assistant",
        content: finalText,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        model_id: response.modelId,
        tool_calls: allToolCalls,
      },
    },
    origin
  );
};

module.exports = {
  getConversation,
  deleteConversation,
  chatWithAgent,
};
