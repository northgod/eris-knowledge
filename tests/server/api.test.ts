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
});
