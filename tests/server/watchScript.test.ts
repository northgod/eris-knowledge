import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(".");
const scriptPath = path.join(projectRoot, "scripts", "watch-dev.ps1");
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("watch-dev script", () => {
  it("is exposed through npm scripts", () => {
    expect(packageJson.scripts["dev:watch"]).toBe(
      "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/watch-dev.ps1"
    );
  });

  it("monitors API and Vite endpoints without starting duplicate processes", () => {
    const script = fs.readFileSync(scriptPath, "utf8");

    expect(script).toContain('http://127.0.0.1:4174/api/health');
    expect(script).toContain('http://127.0.0.1:5174/');
    expect(script).toContain('Start-DevProcess');
    expect(script).toContain('Test-Endpoint');
    expect(script).toContain('$ProcessRef.Value -and -not $ProcessRef.Value.HasExited');
    expect(script).toContain('npm.cmd');
  });
});
