# Generate a random password for the database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store database credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/${var.environment}/db-credentials"
  description             = "Database credentials for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
    engine   = "postgres"
  })
}

# Generate a random JWT signing secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# Store JWT secret in Secrets Manager
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/${var.environment}/jwt-secret"
  description             = "JWT signing secret for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}
