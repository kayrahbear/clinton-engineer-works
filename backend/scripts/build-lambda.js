const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const buildDir = path.resolve(__dirname, "../build");
const zipName = "lambda.zip";
const zipPath = path.join(buildDir, zipName);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const copyRecursive = (src, dest) => {
  if (!fs.existsSync(src)) {
    return;
  }

  if (fs.statSync(src).isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.copyFileSync(src, dest);
};

const cleanBuild = () => {
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  ensureDir(buildDir);
};

const build = () => {
  cleanBuild();

  const srcDir = path.resolve(__dirname, "../src");
  copyRecursive(srcDir, buildDir);

  const packageJson = path.resolve(__dirname, "../package.json");
  copyRecursive(packageJson, path.join(buildDir, "package.json"));

  console.log("Installing production dependencies...");
  execSync("npm install --omit=dev", { cwd: buildDir, stdio: "inherit" });

  console.log("Creating lambda.zip...");
  execSync(`zip -r ${zipName} .`, { cwd: buildDir, stdio: "inherit" });

  console.log(`Lambda package created at ${zipPath}`);
};

build();