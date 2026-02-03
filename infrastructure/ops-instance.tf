data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "ops" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.ops_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.ops.id]
  iam_instance_profile        = aws_iam_instance_profile.ops.name
  associate_public_ip_address = true

  tags = {
    Name = "${var.project_name}-${var.environment}-ops"
  }
}