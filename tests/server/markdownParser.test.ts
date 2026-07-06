import { describe, expect, it } from "vitest";
import { parseMarkdownEmbeddedArtifacts, parseMarkdownScenes } from "../../src/server/parser/markdownParser";

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
      cameraLabel: "WIDE",
      summary: "空。"
    });
    expect(scenes[0].cuts[1]).toMatchObject({
      cutKey: "2",
      dialogue: "なし"
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

  it("preserves arbitrary scene and cut detail lines", () => {
    const markdown = `# Sample

## シーン 002 追跡

- 時間: 00:06-00:12 / 6秒
- 内容: 路地を抜ける。
- 天候: 雨
- CUT PLAN:
  - CUT3 [00:06-00:09] HANDHELD:
    - 画面: 主人公が走る。
    - 参照ロール: hero_run.png
    - 音: 足音と雨
`;

    const scenes = parseMarkdownScenes(markdown, "02_テキストコンテ.md");

    expect(scenes[0]).toMatchObject({
      summary: "路地を抜ける。",
      details: expect.stringContaining("天候: 雨")
    });
    expect(scenes[0].cuts[0]).toMatchObject({
      cutKey: "3",
      timeRange: "00:06-00:09",
      cameraLabel: "HANDHELD",
      summary: "主人公が走る。",
      details: expect.stringContaining("参照ロール: hero_run.png")
    });
    expect(scenes[0].cuts[0]).toMatchObject({
      details: expect.stringContaining("音: 足音と雨")
    });
  });

  it("detects embedded video prompt sections in combined markdown files", () => {
    const markdown = `# 02 テキストコンテ

## シーン 001

CUT 1 [00:00-00:02] WIDE:

## 動画生成プロンプト

- model: seedance
- prompt: Hold on sky.
`;

    expect(parseMarkdownEmbeddedArtifacts(markdown)).toEqual([
      {
        kind: "video_prompt",
        gate: "G3",
        fragment: "#video-prompt",
        lineNumber: 7
      }
    ]);
  });
});
