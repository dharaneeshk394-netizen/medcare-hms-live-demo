require("dotenv").config();

const app = require("./app");
const { testDatabaseConnection } = require("./config/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await testDatabaseConnection();
  } catch (error) {
    console.warn(
      "PostgreSQL connection notice (server starting anyway):",
      error.message
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Hospital Management System API running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer();