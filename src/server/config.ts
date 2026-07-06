import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "../shared/types";

const currentFile = fileURLToPath(import.meta.url);
const serverDir = path.dirname(currentFile);
const projectRoot = path.resolve(serverDir, "..", "..");

export function createConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    scarletRoot: env.SCARLET_ROOT ?? "D:\\Github\\ScarletEchoes\\ScarletEchoes",
    databasePath:
      env.ERIS_KNOWLEDGE_DB ?? path.join(projectRoot, "data", "eris-knowledge.sqlite"),
    port: Number(env.PORT ?? 4174)
  };
}

export const config = createConfig(process.env);
