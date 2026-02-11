# Placeholder Lambda function (will be replaced with actual handlers)
# This creates the infrastructure scaffolding for Lambda deployment

# Lambda function for the API
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.environment}-api"
  description   = "Sims Legacy Tracker API handler"

  # Deployment package stored in S3
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key           = aws_s3_object.lambda_placeholder.key
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  runtime     = var.lambda_runtime
  handler     = "index.handler"
  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  role = aws_iam_role.lambda_execution.arn

  environment {
    variables = {
      NODE_ENV            = var.environment
      DB_SECRET_ARN       = aws_secretsmanager_secret.db_credentials.arn
      JWT_SECRET_ARN      = aws_secretsmanager_secret.jwt_secret.arn
      CORS_ALLOWED_ORIGIN = var.environment == "prod" ? "https://your-domain.com" : "*"
      BEDROCK_MODEL_ID    = var.bedrock_model_id
      BEDROCK_MAX_TOKENS  = var.bedrock_max_tokens
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
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

# Upload placeholder zip to S3
resource "aws_s3_object" "lambda_placeholder" {
  bucket = aws_s3_bucket.lambda_deployments.bucket
  key    = "lambda-placeholder.zip"
  source = data.archive_file.lambda_placeholder.output_path
  etag   = filemd5(data.archive_file.lambda_placeholder.output_path)
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
