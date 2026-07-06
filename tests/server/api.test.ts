import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app";
import { migrate } from "../../src/server/db/schema";
import { createRepositories } from "../../src/server/db/repositories";

describe("API", () => {
  it("returns health and production list", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const repos = createRepositories(db);
    repos.productions.upsert({
      id: "story::prod",
      storyName: "story",
      productionPath: "prod",
      absolutePath: "D:\\story\\prod",
      detectionType: "manual",
      lastContentMtime: null
    });

    const app = createApp({ db, scarletRoot: "D:\\Scarlet" });

    await request(app).get("/api/health").expect(200).expect((res) => {
      expect(res.body).toMatchObject({ ok: true, scarletRoot: "D:\\Scarlet" });
    });

    await request(app).get("/api/productions").expect(200).expect((res) => {
      expect(res.body.productions[0]).toMatchObject({
        id: "story::prod",
        storyName: "story",
        gates: {
          G0: "missing",
          G1: "missing",
          G2: "missing",
          G3: "missing",
          G4: "missing"
        },
        sceneCount: 0,
        cutCount: 0
      });
    });
  });

  it("returns production detail with parsed scenes, cuts, and assets", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const repos = createRepositories(db);
    repos.productions.upsert({
      id: "story::prod",
      storyName: "story",
      productionPath: "prod",
      absolutePath: "D:\\story\\prod",
      detectionType: "manual",
      lastContentMtime: null
    });
    repos.artifacts.replaceForProduction("story::prod", [
      {
        id: "artifact-1",
        productionId: "story::prod",
        kind: "text_storyboard",
        gate: "G1",
        relativePath: "stories/story/02_Anime/storyboards/prod/text.md",
        absolutePath: "D:\\story\\prod\\text.md",
        extension: ".md",
        sizeBytes: 120,
        mtime: "2026-07-06T00:00:00.000Z",
        contentHash: null
      }
    ]);
    repos.scenes.replaceForProduction("story::prod", [
      {
        id: "scene-1",
        sourceArtifactId: "artifact-1",
        sceneKey: "001",
        title: "Opening",
        timeRange: "00:00-00:03",
        durationSeconds: 3,
        summary: "Hero arrives",
        lineNumber: 3,
        cuts: [
          {
            id: "cut-1",
            cutKey: "1",
            timeRange: "00:00-00:01",
            durationSeconds: 1,
            cameraLabel: "wide",
            summary: "City reveal",
            dialogue: null,
            lineNumber: 4
          }
        ]
      }
    ]);

    const app = createApp({ db, scarletRoot: "D:\\Scarlet" });

    await request(app)
      .get(`/api/productions/${encodeURIComponent("story::prod")}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.detail.production).toMatchObject({ id: "story::prod", sceneCount: 1, cutCount: 1 });
        expect(res.body.detail.scenes[0]).toMatchObject({ sceneKey: "001", title: "Opening" });
        expect(res.body.detail.scenes[0].cuts[0]).toMatchObject({ cutKey: "1", summary: "City reveal" });
        expect(res.body.detail.artifacts[0]).toMatchObject({ kind: "text_storyboard", gate: "G1" });
      });
  });
  it("persists app-local note and checked status without changing source files", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const repos = createRepositories(db);
    repos.productions.upsert({
      id: "story::prod",
      storyName: "story",
      productionPath: "prod",
      absolutePath: "D:\\story\\prod",
      detectionType: "manual",
      lastContentMtime: null
    });

    const app = createApp({ db, scarletRoot: "D:\\Scarlet" });

    await request(app)
      .put("/api/manual/note")
      .send({ targetType: "production", targetId: "story::prod", note: "G2確認待ち" })
      .expect(200);

    await request(app)
      .put("/api/manual/status")
      .send({ targetType: "production", targetId: "story::prod", status: "checked", checked: true })
      .expect(200);

    await request(app)
      .get(`/api/productions/${encodeURIComponent("story::prod")}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.detail.manualNote).toBe("G2確認待ち");
        expect(res.body.detail.production.checked).toBe(true);
      });
  });
  it("returns a read-only text preview for an indexed asset", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eris-preview-"));
    const previewPath = path.join(tempDir, "cut_001.md");
    fs.writeFileSync(previewPath, "# Scene 001\nCUT 1: opening prompt", "utf8");

    const db = new Database(":memory:");
    migrate(db);
    const repos = createRepositories(db);
    repos.productions.upsert({
      id: "story::prod",
      storyName: "story",
      productionPath: "prod",
      absolutePath: tempDir,
      detectionType: "manual",
      lastContentMtime: null
    });
    repos.artifacts.replaceForProduction("story::prod", [
      {
        id: "artifact-preview",
        productionId: "story::prod",
        kind: "video_prompt",
        gate: "G3",
        relativePath: "stories/story/02_Anime/storyboards/prod/video_prompts/cut_001.md",
        absolutePath: previewPath,
        extension: ".md",
        sizeBytes: 36,
        mtime: "2026-07-06T00:00:00.000Z",
        contentHash: null
      }
    ]);

    const app = createApp({ db, scarletRoot: tempDir });

    await request(app)
      .get(`/api/assets/${encodeURIComponent("artifact-preview")}/preview`)
      .expect(200)
      .expect((res) => {
        expect(res.body.preview).toMatchObject({
          id: "artifact-preview",
          relativePath: "stories/story/02_Anime/storyboards/prod/video_prompts/cut_001.md",
          mode: "text",
          text: "# Scene 001\nCUT 1: opening prompt",
          truncated: false
        });
      });
  });
});

