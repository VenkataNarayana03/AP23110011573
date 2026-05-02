"use strict";

const http = require("http");
const { port } = require("./config");
const { log } = require("./logger");
const { router } = require("./routes");
const { sendJson } = require("./utils");

const server = http.createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (error) {
    log("fatal", "handler", `Unhandled request failure: ${error.stack || error.message}`);
    sendJson(res, 500, { error: "internal server error" });
  }
});

server.listen(port, () => {
  log("info", "config", `Vehicle maintenance scheduler listening on port ${port}`);
  console.log(`Vehicle maintenance scheduler listening on http://localhost:${port}`);
});
