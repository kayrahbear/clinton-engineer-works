const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { parseBody, isValidUuid } = require("../utils/validation");
const { verifyLegacyOwnership } = require("../utils/authorization");
const { BedrockService } = require("../services/bedrock");
const { buildLegacyContext } = require("../services/context-builder");

const MESSAGE_LIMIT = 8000;

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
    `SELECT message_id, role, content, input_tokens, output_tokens, created_at
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

  const contextResult = await buildLegacyContext(legacy_id, userId);
  if (!contextResult) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  const bedrock = new BedrockService();
  const response = await bedrock.invokeModel({
    systemPrompt: contextResult.systemPrompt,
    userPrompt: message,
    contextText: contextResult.contextText,
  });

  await pool.query(
    `INSERT INTO messages (conversation_id, role, content, input_tokens, output_tokens)
     VALUES ($1, 'assistant', $2, $3, $4)`,
    [conversationId, response.text, response.inputTokens, response.outputTokens]
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
        content: response.text,
        input_tokens: response.inputTokens,
        output_tokens: response.outputTokens,
        model_id: response.modelId,
      },
    },
    origin
  );
};

module.exports = {
  getConversation,
  chatWithAgent,
};
