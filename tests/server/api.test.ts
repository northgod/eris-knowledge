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
});
