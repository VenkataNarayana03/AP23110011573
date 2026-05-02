"use strict";

const config = require("../src/config");

const validStacks = new Set(["backend", "frontend"]);
const validLevels = new Set(["debug", "info", "warn", "error", "fatal"]);
const validPackages = new Set([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "middleware",
  "repository",
  "route",
  "service",
  "config",
  "utils"
]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function Log(stack, level, packageName, message) {
  const payload = {
    stack: normalize(stack),
    level: normalize(level),
    package: normalize(packageName),
    message: String(message || "")
  };

  if (!validStacks.has(payload.stack)) {
    throw new Error(`Invalid logging stack: ${stack}`);
  }

  if (!validLevels.has(payload.level)) {
    throw new Error(`Invalid logging level: ${level}`);
  }

  if (!validPackages.has(payload.package)) {
    throw new Error(`Invalid logging package: ${packageName}`);
  }

  if (!payload.message) {
    throw new Error("Log message is required");
  }

  const token = config.accessToken;
  const endpoint = config.logApiUrl;

  if (!token) {
    return {
      skipped: true,
      reason: "LOG_ACCESS_TOKEN is not configured",
      payload
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let body = responseText;

    try {
      body = responseText ? JSON.parse(responseText) : null;
    } catch {
      body = responseText;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        body,
        payload
      };
    }

    return {
      ok: true,
      status: response.status,
      body,
      payload
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      payload
    };
  }
}

module.exports = {
  Log
};
