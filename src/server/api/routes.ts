import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import { Router } from "express";
import { toNeedsAttentionItem } from "../../shared/attention";
import type { ArtifactRecord, AssetPreviewPayload, NeedsAttentionItem } from "../../shared/types";
import { createRepositories } from "../db/repositories";
import { indexRoot } from "../indexer/indexer";

export interface RouteContext {
  db: Database.Database;
  scarletRoot: string;
}

const TEXT_PREVIEW_LIMIT = 20_000;
const TEXT_PREVIEW_EXTENSIONS = new Set([".md", ".json", ".txt", ".csv", ".tsv", ".log"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const TEXT_PREVIEW_KINDS = new Set([
  "brief",
  "script",
  "text_storyboard",
  "video_prompt",
  "codex_task",
  "approval",
  "orchestrator_state",
  "markdown",
  "json"
]);

function isInsideRoot(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root).toLowerCase();
  const resolvedTarget = path.resolve(target).toLowerCase();
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

function isTextPreviewable(asset: ArtifactRecord): boolean {
  return TEXT_PREVIEW_EXTENSIONS.has(asset.extension.toLowerCase()) || TEXT_PREVIEW_KINDS.has(asset.kind);
}

function isImageAsset(asset: ArtifactRecord): boolean {
  return IMAGE_EXTENSIONS.has(asset.extension.toLowerCase()) || asset.kind === "storyboard_sheet" || asset.kind === "image";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function createAssetPreview(asset: ArtifactRecord): Promise<AssetPreviewPayload> {
  const base = {
    id: asset.id,
    relativePath: asset.relativePath,
    absolutePath: asset.absolutePath,
    kind: asset.kind,
    sizeBytes: asset.sizeBytes,
    mtime: asset.mtime
  };

  if (!isTextPreviewable(asset)) {
    return { ...base, mode: "metadata", text: null, truncated: false };
  }

  const content = await fs.readFile(asset.absolutePath, "utf8");
  const truncated = content.length > TEXT_PREVIEW_LIMIT;
  return {
    ...base,
    mode: "text",
    text: truncated ? content.slice(0, TEXT_PREVIEW_LIMIT) : content,
    truncated
  };
}

export function createRoutes(context: RouteContext): Router {
  const router = Router();
  const repos = createRepositories(context.db);

  router.get("/health", (_req, res) => {
    res.json({ ok: true, scarletRoot: context.scarletRoot });
  });

  router.get("/scans/latest", (_req, res) => {
    res.json({ scan: repos.scanRuns.latest() });
  });

  router.post("/scans", async (_req, res, next) => {
    const scanId = randomUUID();
    repos.scanRuns.start({
      id: scanId,
      startedAt: new Date().toISOString(),
      rootPath: context.scarletRoot
    });

    try {
      await indexRoot({ db: context.db, root: context.scarletRoot, scanRootLabel: scanId });
      repos.scanRuns.finish({
        id: scanId,
        finishedAt: new Date().toISOString(),
        status: "success",
        errorMessage: null
      });
      res.json({ ok: true, scan: repos.scanRuns.latest() });
    } catch (error) {
      repos.scanRuns.finish({
        id: scanId,
        finishedAt: new Date().toISOString(),
        status: "error",
        errorMessage: errorMessage(error)
      });
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

  router.get("/assets/:id/file", (req, res, next) => {
    const asset = repos.api.artifactById(req.params.id);
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    if (!isInsideRoot(context.scarletRoot, asset.absolutePath)) {
      res.status(403).json({ error: "Asset is outside the configured read-only root" });
      return;
    }
    if (!isImageAsset(asset)) {
      res.status(415).json({ error: "Inline file serving is only enabled for image assets" });
      return;
    }

    res.sendFile(asset.absolutePath, { headers: { "Cache-Control": "no-store" } }, (error) => {
      if (error) next(error);
    });
  });

  router.get("/assets/:id/preview", async (req, res, next) => {
    try {
      const asset = repos.api.artifactById(req.params.id);
      if (!asset) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }
      if (!isInsideRoot(context.scarletRoot, asset.absolutePath)) {
        res.status(403).json({ error: "Asset is outside the configured read-only root" });
        return;
      }
      res.json({ preview: await createAssetPreview(asset) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/needs-attention", (_req, res) => {
    const productions = repos.productions.listForApi();
    const items = productions
      .map(toNeedsAttentionItem)
      .filter((item): item is NeedsAttentionItem => item !== null);
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
