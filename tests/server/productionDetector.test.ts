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
});
