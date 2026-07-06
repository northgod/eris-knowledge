import Database from "better-sqlite3";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migrate } from "../../src/server/db/schema";
import { indexRoot } from "../../src/server/indexer/indexer";

describe("indexRoot", () => {
  it("indexes productions, artifacts, scenes, cuts, tasks, and approvals", async () => {
    const db = new Database(":memory:");
    migrate(db);

    await indexRoot({
      db,
      root: path.resolve("tests/fixtures"),
      scanRootLabel: "fixtures"
    });

    const production = db.prepare("SELECT * FROM productions").get() as { id: string };
    const artifactCount = db.prepare("SELECT COUNT(*) AS count FROM artifacts").get() as { count: number };
    const sceneCount = db.prepare("SELECT COUNT(*) AS count FROM scenes").get() as { count: number };
    const cutCount = db.prepare("SELECT COUNT(*) AS count FROM cuts").get() as { count: number };
    const taskCount = db.prepare("SELECT COUNT(*) AS count FROM orchestrator_tasks").get() as { count: number };
    const approvalCount = db.prepare("SELECT COUNT(*) AS count FROM approvals").get() as { count: number };

    expect(production.id).toBe("01_story::sample-production");
    expect(artifactCount.count).toBeGreaterThan(0);
    expect(sceneCount.count).toBe(2);
    expect(cutCount.count).toBe(2);
    expect(taskCount.count).toBe(1);
    expect(approvalCount.count).toBe(1);
  });
});
