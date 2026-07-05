const { execSync } = require("child_process");
const path = require("path");
const os = require("os");

const SEP = os.platform() === "win32" ? ";" : ":";
const EXE_SUFFIX = os.platform() === "win32" ? ".exe" : "";

function findJava() {
  const { JAVA_HOME } = process.env;
  if (JAVA_HOME) return path.join(JAVA_HOME, "bin", "java" + EXE_SUFFIX);
  return "java" + EXE_SUFFIX;
}

const allureDist = path.resolve(__dirname, "..", "node_modules", "allure-commandline", "dist");
const classpath = path.join(allureDist, "lib", "*") + SEP + path.join(allureDist, "lib", "config");
const args = process.argv.slice(2).join(" ");
const javaExe = findJava();

const cmd = '"' + javaExe + '" -classpath "' + classpath + '" io.qameta.allure.CommandLine generate ' + args;
execSync(cmd, { stdio: "inherit", shell: true });
