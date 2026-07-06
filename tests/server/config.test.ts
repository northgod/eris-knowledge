import { describe, expect, it } from "vitest";
import { createConfig } from "../../src/server/config";

describe("createConfig", () => {
  it("uses the local ScarletEchoes root and app-local database path by default", () => {
    const config = createConfig({});

    expect(config.scarletRoot).toBe("D:\\Github\\ScarletEchoes\\ScarletEchoes");
    expect(config.databasePath.endsWith("data\\eris-knowledge.sqlite")).toBe(true);
    expect(config.port).toBe(4174);
  });

  it("accepts explicit overrides", () => {
    const config = createConfig({
      SCARLET_ROOT: "X:\\Scarlet",
      ERIS_KNOWLEDGE_DB: "X:\\db.sqlite",
      PORT: "4999"
    });

    expect(config.scarletRoot).toBe("X:\\Scarlet");
    expect(config.databasePath).toBe("X:\\db.sqlite");
    expect(config.port).toBe(4999);
  });
});
