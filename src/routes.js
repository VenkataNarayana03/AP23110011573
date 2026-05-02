"use strict";

const { accessToken, baseUrl, depotApiUrl, tasksApiUrl } = require("./config");
const { log } = require("./logger");
const { scheduleMaintenance } = require("./scheduler");
const { readJson, sendJson } = require("./utils");
const { notificationRouter } = require("./notification_routes");

function appendQuery(url, params) {
  const target = new URL(url);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      target.searchParams.set(key, value);
    }
  }

  return target.toString();
}

async function fetchJson(url, label) {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await fetch(url, { headers });
  const responseText = await response.text();
  let body = responseText;

  try {
    body = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(`${label} API did not return valid JSON`);
  }

  if (!response.ok) {
    throw new Error(`${label} API failed with status ${response.status}`);
  }

  return body;
}

function extractTasks(body) {
  return body.tasks || body.vehicles || body.serviceRequests || body.data;
}

function extractBudget(body) {
  return body.budget || body.availableHours || body.mechanicHours || body.dailyMechanicHours;
}

async function loadScheduleInput(requestBody) {
  const depotId = requestBody.depotId || requestBody.depot || requestBody.id;
  let tasks = extractTasks(requestBody);
  let budget = extractBudget(requestBody);

  if (!tasks && tasksApiUrl) {
    const taskUrl = appendQuery(tasksApiUrl, { depotId });
    const taskBody = await fetchJson(taskUrl, "tasks");
    tasks = extractTasks(taskBody);
  }

  if (!budget && depotApiUrl) {
    const depotUrl = appendQuery(depotApiUrl, { depotId });
    const depotBody = await fetchJson(depotUrl, "depot");
    budget = extractBudget(depotBody);
  }

  return {
    depotId: depotId || null,
    tasks,
    budget
  };
}

async function createSchedule(req, res) {
  let body;

  try {
    body = await readJson(req);
  } catch (error) {
    log("warn", "controller", `Schedule request rejected because JSON was invalid: ${error.message}`);
    sendJson(res, 400, { error: error.message });
    return;
  }

  try {
    const input = await loadScheduleInput(body);
    const schedule = scheduleMaintenance(input.tasks, input.budget);

    log(
      "info",
      "service",
      `Created maintenance schedule for ${schedule.selectedVehicles.length} vehicles with impact ${schedule.totalImpactScore}`
    );

    sendJson(res, 200, {
      depotId: input.depotId,
      ...schedule
    });
  } catch (error) {
    const statusCode = error.message.includes("API") ? 502 : 400;
    log("error", "handler", `Schedule request failed: ${error.message}`);
    sendJson(res, statusCode, { error: error.message });
    return;
  }
}

async function router(req, res) {
  const url = new URL(req.url, baseUrl);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  log("debug", "middleware", `Incoming ${req.method} request for ${pathname}`);

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { status: "ok", service: "vehicle-maintenance-scheduler" });
    return;
  }

  if (pathname.startsWith("/notifications")) {
    await notificationRouter(req, res, pathname);
    return;
  }

  if (req.method === "POST" && (pathname === "/schedule" || pathname === "/maintenance/schedule")) {
    await createSchedule(req, res);
    return;
  }

  log("warn", "route", `No scheduler route matched ${req.method} ${pathname}`);
  sendJson(res, 404, { error: "route not found" });
}

module.exports = {
  router
};
