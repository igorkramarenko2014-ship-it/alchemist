#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const skip = path.join(__dirname, "..", "pkg", ".skip");
fs.rmSync(skip, { force: true });
