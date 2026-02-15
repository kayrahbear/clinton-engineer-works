const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const buildDir = path.resolve(__dirname, "../build");
const zipPath = path.join(buildDir, "lambda.zip");

const awsProfile = process.env.AWS_PROFILE || "kbsandbox";
const s3Bucket =
  process.env.SIMS_LAMBDA_BUCKET || "sims-legacy-tracker-dev-lambda-deployments";
const s3Key = process.env.SIMS_LAMBDA_KEY || "lambda-dev.zip";
const defaultFunction =
  process.env.SIMS_LAMBDA_FUNCTION || "sims-legacy-tracker-dev-api";
const streamFunction =
  process.env.SIMS_LAMBDA_STREAM_FUNCTION || "sims-legacy-tracker-dev-api-stream";
const functionList = (
  process.env.SIMS_LAMBDA_FUNCTIONS ||
  [defaultFunction, streamFunction].join(",")
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const exec = (command) => {
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, AWS_PROFILE: awsProfile },
  });
};

const deploy = () => {
  console.log("Building lambda package...");
  exec("node scripts/build-lambda.js");

  if (!fs.existsSync(zipPath)) {
    throw new Error(`Missing lambda package at ${zipPath}`);
  }

  console.log("Uploading lambda package to S3...");
  exec(`aws s3 cp "${zipPath}" "s3://${s3Bucket}/${s3Key}"`);

  console.log("Updating lambda function code...");
  functionList.forEach((functionName) => {
    console.log(`- ${functionName}`);
    exec(
      [
        "aws lambda update-function-code",
        `--function-name "${functionName}"`,
        `--s3-bucket "${s3Bucket}"`,
        `--s3-key "${s3Key}"`,
      ].join(" ")
    );
  });

  console.log("Lambda deployment complete.");
};

deploy();
