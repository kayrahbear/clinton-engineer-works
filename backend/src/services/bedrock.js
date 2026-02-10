const DEFAULT_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";

class BedrockService {
  constructor({ modelId, region } = {}) {
    this.modelId = modelId || DEFAULT_MODEL_ID;
    this.region = region || process.env.AWS_REGION || "us-east-1";
  }

  estimateTokens(text) {
    if (!text || typeof text !== "string") {
      return 0;
    }
    return Math.max(1, Math.ceil(text.length / 4));
  }

  async invokeModel({ systemPrompt, userPrompt, contextText } = {}) {
    const prompt = [systemPrompt, contextText, userPrompt]
      .filter(Boolean)
      .join("\n\n");

    const inputTokens = this.estimateTokens(prompt);

    const responseText =
      "Stubbed response: Bedrock integration is not wired yet. " +
      "Your message was received and recorded.";

    const outputTokens = this.estimateTokens(responseText);

    return {
      text: responseText,
      inputTokens,
      outputTokens,
      modelId: this.modelId,
      provider: "stub",
    };
  }
}

module.exports = {
  BedrockService,
};
