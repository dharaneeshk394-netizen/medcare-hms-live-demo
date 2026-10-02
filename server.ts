import "dotenv/config";
import path from "path";
import http from "http";
import express from "express";
import { createServer as createViteServer } from "vite";
import app from "./backend/src/app.js";
import { testDatabaseConnection } from "./backend/src/config/db.js";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await testDatabaseConnection();
  } catch (error: any) {
    console.warn(
      "PostgreSQL connection notice (server starting anyway):",
      error.message
    );
  }

  const server = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Hospital Management System running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer();
