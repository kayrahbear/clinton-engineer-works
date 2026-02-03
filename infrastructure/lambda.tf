# Placeholder Lambda function (will be replaced with actual handlers)
# This creates the infrastructure scaffolding for Lambda deployment

# Lambda function for the API
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.environment}-api"
  description   = "Sims Legacy Tracker API handler"

  # Placeholder - will be updated with actual deployment package
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  runtime     = var.lambda_runtime
  handler     = "index.handler"
  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  role = aws_iam_role.lambda_execution.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV           = var.environment
      DB_SECRET_ARN      = aws_secretsmanager_secret.db_credentials.arn
      CORS_ALLOWED_ORIGIN = var.environment == "prod" ? "https://your-domain.com" : "*"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_vpc,
  ]
}

# Placeholder zip for initial Lambda deployment
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.build/placeholder.zip"

  source {
    content  = "exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ message: 'Sims Legacy Tracker API' }) });"
    filename = "index.js"
  }
}

# CloudWatch log group for Lambda
resource "aws_cloudwatch_log_group" "lambda_api" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = var.environment == "prod" ? 90 : 14
}

# API Gateway Lambda integration permission
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
