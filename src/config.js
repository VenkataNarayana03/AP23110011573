"use strict";

const fs = require("fs");
const path = require("path");

function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, "..", fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.example");

const config = {
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.BASE_URL || "",
  logApiUrl: process.env.LOG_API_URL || "",
  accessToken: process.env.LOG_ACCESS_TOKEN || "",
  depotApiUrl: process.env.DEPOT_API_URL || "",
  tasksApiUrl: process.env.TASKS_API_URL || ""
};

function requireConfig(name, value) {
  if (!value) {
    throw new Error(`${name} must be configured in .env or .env.example`);
  }
}

requireConfig("BASE_URL", config.baseUrl);
requireConfig("LOG_API_URL", config.logApiUrl);
requireConfig("LOG_ACCESS_TOKEN", config.accessToken);

module.exports = config;
