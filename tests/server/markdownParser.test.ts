import { describe, expect, it } from "vitest";
import { parseMarkdownScenes } from "../../src/server/parser/markdownParser";

describe("parseMarkdownScenes", () => {
  it("extracts Japanese scene headings and cut plans", () => {
    const markdown = `# Sample

## シーン 001

- 時間: 00:00-00:06 / 6秒
- 内容: 霧雨の導入。
- CUT PLAN:
  - CUT1 [00:00-00:03] WIDE:
    - 画面: 空。
  - CUT2 [00:03-00:06] CLOSE:
    - セリフ: なし
`;

    const scenes = parseMarkdownScenes(markdown, "02_テキストコンテ.md");

    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({
      sceneKey: "001",
      title: "シーン 001",
      timeRange: "00:00-00:06"
    });
    expect(scenes[0].cuts).toHaveLength(2);
    expect(scenes[0].cuts[0]).toMatchObject({
      cutKey: "1",
      timeRange: "00:00-00:03",
      cameraLabel: "WIDE"
    });
  });

  it("extracts video prompt cut lines", () => {
    const markdown = `# Scene 00 Video Prompt

CUT 1 [00:00-00:02] STATIC / CLOUDY SKY:
Hold on sky.
`;

    const scenes = parseMarkdownScenes(markdown, "scene_00_seedance2_prompt.md");

    expect(scenes[0].sceneKey).toBe("00");
    expect(scenes[0].cuts[0].cameraLabel).toBe("STATIC / CLOUDY SKY");
  });
});
