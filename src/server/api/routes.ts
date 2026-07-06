import type Database from "better-sqlite3";
import { Router } from "express";
import { createRepositories } from "../db/repositories";
import { indexRoot } from "../indexer/indexer";

export interface RouteContext {
  db: Database.Database;
  scarletRoot: string;
}

export function createRoutes(context: RouteContext): Router {
  const router = Router();
  const repos = createRepositories(context.db);

  router.get("/health", (_req, res) => {
    res.json({ ok: true, scarletRoot: context.scarletRoot });
  });

  router.post("/scans", async (_req, res, next) => {
    try {
      await indexRoot({ db: context.db, root: context.scarletRoot, scanRootLabel: "ScarletEchoes" });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/productions", (_req, res) => {
    res.json({ productions: repos.productions.listForApi() });
  });

  router.get("/productions/:id", (req, res) => {
    const detail = repos.api.productionDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: "Production not found" });
      return;
    }
    res.json({ detail });
  });

  router.get("/assets", (_req, res) => {
    res.json({ assets: repos.api.artifacts() });
  });

  router.get("/needs-attention", (_req, res) => {
    const productions = repos.productions.listForApi();
    const items = productions.filter(
      (production) =>
        production.detectionType !== "loose" &&
        production.gates.G1 === "detected" &&
        (production.gates.G2 === "missing" || production.gates.G3 === "missing")
    );
    res.json({ items });
  });

  router.put("/manual/note", (req, res) => {
    const { targetType, targetId, note } = req.body as {
      targetType: string;
      targetId: string;
      note: string;
    };
    repos.manual.upsertNote({ targetType, targetId, note });
    res.json({ ok: true });
  });

  router.put("/manual/status", (req, res) => {
    const { targetType, targetId, status, priority, checked } = req.body as {
      targetType: string;
      targetId: string;
      status: string;
      priority?: string;
      checked?: boolean;
    };
    repos.manual.upsertStatus({
      targetType,
      targetId,
      status,
      priority: priority ?? "normal",
      checked: Boolean(checked)
    });
    res.json({ ok: true });
  });

  router.post("/tags", (req, res) => {
    const { name, color } = req.body as { name: string; color?: string };
    const id = repos.tags.upsert({ name, color: color ?? "#315c6f" });
    res.json({ id });
  });

  router.put("/tags/:id", (req, res) => {
    const { name, color } = req.body as { name: string; color?: string };
    const id = repos.tags.upsert({ name, color: color ?? "#315c6f" });
    res.json({ id });
  });

  router.post("/taggings", (req, res) => {
    const { tagId, targetType, targetId } = req.body as {
      tagId: string;
      targetType: string;
      targetId: string;
    };
    repos.tags.tag({ tagId, targetType, targetId });
    res.json({ ok: true });
  });

  router.delete("/taggings/:tagId/:targetType/:targetId", (req, res) => {
    repos.tags.untag(req.params as { tagId: string; targetType: string; targetId: string });
    res.json({ ok: true });
  });

  return router;
}

