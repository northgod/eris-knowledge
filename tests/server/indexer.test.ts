import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { createRepositories } from "../../src/server/db/repositories";
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

  it("records a scan issue and continues when codex task JSON is invalid", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eris-indexer-"));
    const productionDir = path.join(root, "stories", "story", "02_Anime", "storyboards", "prod");
    const taskDir = path.join(productionDir, "codex_tasks");
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(
      path.join(productionDir, "02_テキストコンテ.md"),
      "# Scene 001 Opening\nCUT 1: City reveal",
      "utf8"
    );
    fs.writeFileSync(path.join(taskDir, "broken.json"), "{ broken json", "utf8");

    const db = new Database(":memory:");
    migrate(db);

    try {
      await indexRoot({ db, root, scanRootLabel: "temp" });

      const production = db.prepare("SELECT * FROM productions").get() as { id: string };
      const sceneCount = db.prepare("SELECT COUNT(*) AS count FROM scenes").get() as { count: number };
      const taskCount = db.prepare("SELECT COUNT(*) AS count FROM orchestrator_tasks").get() as { count: number };
      const issue = db.prepare("SELECT * FROM scan_issues").get() as {
        severity: string;
        relative_path: string;
        issue_code: string;
        message: string;
      };

      expect(production.id).toBe("story::prod");
      expect(sceneCount.count).toBe(1);
      expect(taskCount.count).toBe(0);
      expect(issue).toMatchObject({
        severity: "error",
        relative_path: "stories/story/02_Anime/storyboards/prod/codex_tasks/broken.json",
        issue_code: "json_parse_error"
      });
      expect(issue.message).toContain("JSON");
    } finally {
      if (root.startsWith(os.tmpdir())) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("indexes embedded video prompt sections from text storyboard markdown", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eris-embedded-prompt-"));
    const productionDir = path.join(root, "stories", "story", "02_Anime", "storyboards", "prod");
    fs.mkdirSync(productionDir, { recursive: true });
    const storyboardPath = path.join(productionDir, "02_テキストコンテ.md");
    fs.writeFileSync(
      storyboardPath,
      `# Scene 001 Opening

CUT 1 [00:00-00:02] WIDE:

## 動画生成プロンプト

- prompt: Hold on sky.
`,
      "utf8"
    );

    const db = new Database(":memory:");
    migrate(db);

    try {
      await indexRoot({ db, root, scanRootLabel: "temp" });

      const artifacts = db.prepare(`
        SELECT kind, gate, relative_path AS relativePath, absolute_path AS absolutePath
        FROM artifacts
        ORDER BY kind, relative_path
      `).all() as Array<{ kind: string; gate: string; relativePath: string; absolutePath: string }>;
      const production = createRepositories(db).productions.listForApi()[0];

      expect(artifacts).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "text_storyboard",
          gate: "G1",
          relativePath: "stories/story/02_Anime/storyboards/prod/02_テキストコンテ.md",
          absolutePath: storyboardPath
        }),
        expect.objectContaining({
          kind: "video_prompt",
          gate: "G3",
          relativePath: "stories/story/02_Anime/storyboards/prod/02_テキストコンテ.md#video-prompt",
          absolutePath: storyboardPath
        })
      ]));
      expect(production.videoPromptCount).toBe(1);
      expect(production.gates.G3).toBe("detected");
    } finally {
      if (root.startsWith(os.tmpdir())) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });
});
