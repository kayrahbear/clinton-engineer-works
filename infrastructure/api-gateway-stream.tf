# HTTP API Gateway (streaming) for agent chat
resource "aws_apigatewayv2_api" "stream" {
  name          = "${var.project_name}-${var.environment}-api-stream"
  description   = "Sims Legacy Tracker API streaming routes - ${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Content-Type", "Authorization"]
    allow_methods = ["POST", "OPTIONS"]
    allow_origins = [var.environment == "prod" ? "https://your-domain.com" : "*"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_integration" "stream_agent_chat" {
  api_id                 = aws_apigatewayv2_api.stream.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api_stream.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "stream_agent_chat" {
  api_id    = aws_apigatewayv2_api.stream.id
  route_key = "POST /api/v1/agent/chat/stream"
  target    = "integrations/${aws_apigatewayv2_integration.stream_agent_chat.id}"
}

resource "aws_apigatewayv2_stage" "stream" {
  api_id      = aws_apigatewayv2_api.stream.id
  name        = var.environment
  auto_deploy = true
}
