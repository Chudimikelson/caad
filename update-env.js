#!/usr/bin/env node

/**
 * Auto-update .env REACT_APP_API_URL based on current WiFi IP
 * Runs before `npm start` to ensure the correct server address
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const ENV_FILE = path.join(__dirname, ".env");
const SERVER_PORT = 4000;

/**
 * Get the WiFi/network IP address (v4)
 * Prioritizes non-loopback addresses
 */
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }

  // Fallback to localhost if no external IP found
  return "127.0.0.1";
}

/**
 * Read current .env and parse key=value pairs
 */
function readEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    return {};
  }
  const content = fs.readFileSync(ENV_FILE, "utf8");
  const env = {};
  content.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && key.trim()) {
      env[key.trim()] = valueParts.join("=").trim();
    }
  });
  return env;
}

/**
 * Write env object back to .env file
 */
function writeEnv(env) {
  const lines = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  fs.writeFileSync(ENV_FILE, lines + "\n", "utf8");
}

// Main logic
const currentIP = getLocalIPAddress();
const newURL = `http://${currentIP}:${SERVER_PORT}`;
const env = readEnv();
const oldURL = env.REACT_APP_API_URL;

if (oldURL !== newURL) {
  env.REACT_APP_API_URL = newURL;
  writeEnv(env);
  console.log(`✓ Updated REACT_APP_API_URL: ${oldURL} → ${newURL}`);
} else {
  console.log(`✓ REACT_APP_API_URL already correct: ${newURL}`);
}
