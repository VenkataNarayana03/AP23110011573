"use strict";

const { Log } = require("../logging-middleware");

function log(level, packageName, message) {
  Log("backend", level, packageName, message).catch(() => undefined);
}

module.exports = {
  Log,
  log
};
