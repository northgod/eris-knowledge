import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const styles = fs.readFileSync(path.resolve("src/client/styles.css"), "utf8");

function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? "";
}

describe("client styles", () => {
  it("keeps main content responsive with explicit lower bounds", () => {
    expect(cssRule(":root")).toContain("--content-min-width");
    expect(cssRule(".app-shell")).toContain("width: clamp(var(--content-min-width), 96vw, var(--content-max-width));");
    expect(cssRule(".app-shell")).toContain("max-width: none;");
    expect(cssRule(".scene-board-card")).toContain("overflow-x: auto;");
    expect(cssRule(".scene-board-layout")).toContain(
      "grid-template-columns: minmax(var(--scene-text-min-width), 0.95fr) minmax(var(--scene-image-min-width), 1.05fr);"
    );
  });

  it("visually separates scene board cards", () => {
    expect(cssRule(".scene-board-list")).toContain("gap: 24px;");
    expect(cssRule(".scene-board-card")).toContain("border-left: 5px solid #315c6f;");
    expect(cssRule(".scene-board-card")).toContain("box-shadow: 0 8px 18px rgba(22, 35, 43, 0.08);");
    expect(cssRule(".scene-board-heading")).toContain("border-bottom: 1px solid #d9e1e5;");
  });
});
