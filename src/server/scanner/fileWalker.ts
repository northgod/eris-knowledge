import fs from "node:fs/promises";
import path from "node:path";

export interface WalkedFile {
  absolutePath: string;
  relativePath: string;
  name: string;
}

export async function walkFiles(root: string): Promise<WalkedFile[]> {
  const results: WalkedFile[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        results.push({
          absolutePath,
          relativePath: path.relative(root, absolutePath),
          name: entry.name
        });
      }
    }
  }

  await visit(root);
  return results;
}
