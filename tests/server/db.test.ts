import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrate } from "../../src/server/db/schema";
import { createRepositories } from "../../src/server/db/repositories";

describe("database schema", () => {
  it("stores productions and preserves manual notes across artifact refreshes", () => {
    const db = new Database(":memory:");
    migrate(db);
    const repos = createRepositories(db);

    repos.productions.upsert({
      id: "01_緋色の魔法遣い::EP2/01b",
      storyName: "01_緋色の魔法遣い",
      productionPath: "EP2/01b",
      absolutePath: "D:\\repo\\stories\\01_緋色の魔法遣い\\02_Anime\\storyboards\\EP2\\01b",
      detectionType: "mixed",
      lastContentMtime: "2026-07-06T00:00:00.000Z"
    });

    repos.manual.upsertNote({
      targetType: "production",
      targetId: "01_緋色の魔法遣い::EP2/01b",
      note: "G2確認待ち"
    });

    repos.artifacts.replaceForProduction("01_緋色の魔法遣い::EP2/01b", []);

    expect(repos.productions.list()).toHaveLength(1);
    expect(repos.manual.getNote("production", "01_緋色の魔法遣い::EP2/01b")).toBe("G2確認待ち");
  });
});
