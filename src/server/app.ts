import express from "express";
import type Database from "better-sqlite3";
import { createRoutes } from "./api/routes";

export interface CreateAppInput {
  db: Database.Database;
  scarletRoot: string;
}

export function createApp(input: CreateAppInput) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", createRoutes(input));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ ok: false, error: message });
  });
  return app;
}
