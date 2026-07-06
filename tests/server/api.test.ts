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

    db.prepare(`
      INSERT INTO scan_issues (id, scan_run_id, severity, relative_path, issue_code, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      "issue-1",
      "scan-1",
      "error",
      "stories/story/02_Anime/storyboards/prod/broken.json",
      "json_parse_error",
      "Invalid JSON"
    );
    db.prepare(`
      INSERT INTO scan_issues (id, scan_run_id, severity, relative_path, issue_code, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      "issue-other",
      "scan-1",
      "warning",
      "stories/story/02_Anime/storyboards/other/file.md",
      "markdown_unknown",
      "Unrelated issue"
    );
    const app = createApp({ db, scarletRoot: "D:\\Scarlet" });

    await request(app)
      .get(`/api/productions/${encodeURIComponent("story::prod")}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.detail.production).toMatchObject({ id: "story::prod", sceneCount: 1, cutCount: 1, issueCount: 1 });
        expect(res.body.detail.scenes[0]).toMatchObject({ sceneKey: "001", title: "Opening" });
        expect(res.body.detail.scenes[0].cuts[0]).toMatchObject({ cutKey: "1", summary: "City reveal" });
        expect(res.body.detail.artifacts[0]).toMatchObject({ kind: "text_storyboard", gate: "G1" });
        expect(res.body.detail.issues).toHaveLength(1);
        expect(res.body.detail.issues[0]).toMatchObject({
          id: "issue-1",
          scanRunId: "scan-1",
          severity: "error",
          relativePath: "stories/story/02_Anime/storyboards/prod/broken.json",
          issueCode: "json_parse_error",
          message: "Invalid JSON"
        });
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
  it("serves indexed image assets as read-only files", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eris-image-"));
    const imagePath = path.join(tempDir, "sheet_001.png");
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    );
    fs.writeFileSync(imagePath, pngBytes);

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
        id: "artifact-image",
        productionId: "story::prod",
        kind: "storyboard_sheet",
        gate: "G2",
        relativePath: "stories/story/02_Anime/storyboards/prod/storyboard_sheets/sheet_001.png",
        absolutePath: imagePath,
        extension: ".png",
        sizeBytes: pngBytes.length,
        mtime: "2026-07-06T00:00:00.000Z",
        contentHash: null
      }
    ]);

    const app = createApp({ db, scarletRoot: tempDir });

    await request(app)
      .get(`/api/assets/${encodeURIComponent("artifact-image")}/file`)
      .expect("Content-Type", /image\/png/)
      .expect(200)
      .expect((res) => {
        expect(Buffer.compare(res.body as Buffer, pngBytes)).toBe(0);
      });
  });
});

