import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectProductions } from "../../src/server/scanner/productionDetector";

describe("detectProductions", () => {
  it("detects mixed productions from storyboard artifacts and orchestration markers", async () => {
    const root = path.resolve("tests/fixtures");
    const productions = await detectProductions(root);

    expect(productions).toEqual([
      expect.objectContaining({
        id: "01_story::sample-production",
        storyName: "01_story",
        productionPath: "sample-production",
        detectionType: "mixed"
      })
    ]);
  });

  it("detects root-level plural video prompt markdown as a production artifact", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eris-production-detector-"));
    const productionDir = path.join(root, "stories", "story", "02_Anime", "storyboards", "prod");
    fs.mkdirSync(productionDir, { recursive: true });
    fs.writeFileSync(path.join(productionDir, "06-08_video_prompts_001-018.md"), "# prompts", "utf8");

    try {
      const productions = await detectProductions(root);

      expect(productions).toEqual([
        expect.objectContaining({
          id: "story::prod",
          detectionType: "manual",
          files: ["stories/story/02_Anime/storyboards/prod/06-08_video_prompts_001-018.md"]
        })
      ]);
    } finally {
      if (root.startsWith(os.tmpdir())) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("ignores image-only productions under .bak folders", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eris-production-bak-"));
    const backupSheetDir = path.join(
      root,
      "stories",
      "story",
      "02_Anime",
      "storyboards",
      "prod",
      ".bak",
      "storyboard_sheets"
    );
    fs.mkdirSync(backupSheetDir, { recursive: true });
    fs.writeFileSync(path.join(backupSheetDir, "scene_001.png"), "rejected image");

    try {
      const productions = await detectProductions(root);

      expect(productions).toEqual([]);
    } finally {
      if (root.startsWith(os.tmpdir())) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });
});
