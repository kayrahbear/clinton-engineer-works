const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const DEFAULT_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-3-5-sonnet-20240620-v1:0";
const DEFAULT_INFERENCE_PROFILE_ARN =
  process.env.BEDROCK_INFERENCE_PROFILE_ARN || "";
const DEFAULT_MAX_TOKENS = Number.parseInt(process.env.BEDROCK_MAX_TOKENS || "800", 10);
const DEFAULT_TEMPERATURE = Number.parseFloat(process.env.BEDROCK_TEMPERATURE || "0.7");

class BedrockService {
  constructor({ modelId, region } = {}) {
    this.modelId = modelId || DEFAULT_MODEL_ID;
    this.region = region || process.env.AWS_REGION || "us-east-1";
    this.client = new BedrockRuntimeClient({ region: this.region });
  }

  buildSystemPrompt(systemPrompt, contextText) {
    if (!contextText) {
      return systemPrompt || "";
    }
    if (!systemPrompt) {
      return `Legacy context:\n${contextText}`;
    }
    return `${systemPrompt}\n\nLegacy context:\n${contextText}`;
  }

  extractText(responseBody) {
    if (!responseBody || !Array.isArray(responseBody.content)) {
      return "";
    }
    return responseBody.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  }

  /**
   * Invoke Bedrock with full tool use support.
   * Accepts a complete messages array (multi-turn) and optional tools.
   * Returns the raw response structure needed for the tool use loop.
   *
   * @param {Object} params
   * @param {Array} params.messages - Bedrock messages array [{role, content}, ...]
   * @param {string} params.system - Pre-built system prompt string
   * @param {Array} [params.tools] - Tool definitions array
   * @param {number} [params.maxTokens] - Max output tokens (defaults to env BEDROCK_MAX_TOKENS or 4096)
   * @param {number} [params.temperature] - Temperature (0-1)
   * @returns {{ stopReason, content, inputTokens, outputTokens, modelId }}
   */
  async invokeWithTools({ messages, system, tools, maxTokens, temperature } = {}) {
    const resolvedMaxTokens = Number.isFinite(maxTokens)
      ? maxTokens
      : Math.max(DEFAULT_MAX_TOKENS, 4096);
    const temp = Number.isFinite(temperature) ? temperature : DEFAULT_TEMPERATURE;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: resolvedMaxTokens,
      temperature: temp,
      system: system || "",
      messages,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = { type: "auto" };
    }

    const modelTarget = DEFAULT_INFERENCE_PROFILE_ARN || this.modelId;

    const command = new InvokeModelCommand({
      modelId: modelTarget,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await this.client.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decoded);

    if (!Array.isArray(responseBody.content) || responseBody.content.length === 0) {
      console.warn("Bedrock returned empty content", {
        stop_reason: responseBody.stop_reason,
        usage: responseBody.usage,
        content: responseBody.content,
      });
    }

    return {
      stopReason: responseBody.stop_reason || "end_turn",
      content: responseBody.content || [],
      inputTokens: responseBody.usage?.input_tokens ?? 0,
      outputTokens: responseBody.usage?.output_tokens ?? 0,
      modelId: modelTarget,
    };
  }

  async invokeModel({ systemPrompt, userPrompt, contextText, options = {} } = {}) {
    const maxTokens =
      Number.isFinite(options.maxTokens) ? options.maxTokens : DEFAULT_MAX_TOKENS;
    const temperature =
      Number.isFinite(options.temperature) ? options.temperature : DEFAULT_TEMPERATURE;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      temperature,
      system: this.buildSystemPrompt(systemPrompt, contextText),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt || "",
            },
          ],
        },
      ],
    };

    const modelTarget = DEFAULT_INFERENCE_PROFILE_ARN || this.modelId;

    const command = new InvokeModelCommand({
      modelId: modelTarget,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await this.client.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decoded);

    return {
      text: this.extractText(responseBody),
      inputTokens: responseBody.usage?.input_tokens ?? null,
      outputTokens: responseBody.usage?.output_tokens ?? null,
      modelId: modelTarget,
      provider: "bedrock",
    };
  }
}

module.exports = {
  BedrockService,
};
