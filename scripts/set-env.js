// scripts/set-env.js
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Determine which .env file to use
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";

// Load environment variables from the appropriate .env file
require("dotenv").config({ path: envFile });

// Create the environment configuration
const environment = {
  production: process.env.NODE_ENV === "production",
  apiUrl: process.env.NG_APP_API_URL || "http://localhost:3000/api",
  socketUrl: process.env.NG_APP_SOCKET_URL || "ws://localhost:3000",
  appName: process.env.NG_APP_NAME || "GlobalChat",
  version: process.env.NG_APP_VERSION || "1.0.0",
  enableLogging: process.env.NG_APP_ENABLE_LOGGING === "true",
};

// Create the environment.ts file content
const envConfigFile = `// This file is auto-generated. Do not edit manually.
export const environment = ${JSON.stringify(environment, null, 2)};
`;

// Write to the environment.ts file
const envPath = path.join(__dirname, "../src/environments/environment.ts");
fs.writeFileSync(envPath, envConfigFile);

console.log("✅ Environment configuration generated successfully!");
console.log("📝 Environment:", process.env.NODE_ENV || "development");
console.log("🔗 API URL:", environment.apiUrl);
console.log("📁 File:", envPath);
