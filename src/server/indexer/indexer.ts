import fs from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import { createRepositories, stableId, type ArtifactUpsert } from "../db/repositories";
import { classifyArtifact } from "../scanner/artifactClassifier";
import { detectProductions } from "../scanner/productionDetector";
import { parseApprovalMarkdown } from "../parser/approvalParser";
import { parseMarkdownScenes } from "../parser/markdownParser";
import { parseCodexTask } from "../parser/orchestratorParser";

export interface IndexRootInput {
  db: Database.Database;
  root: string;
  scanRootLabel: string;
}

async function artifactFromPath(root: string, productionId: string, relativePath: string): Promise<ArtifactUpsert> {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  const stat = await fs.stat(absolutePath);
  const classification = classifyArtifact(relativePath);
  return {
    id: stableId(`artifact:${productionId}:${relativePath}`),
    productionId,
    kind: classification.kind,
    gate: classification.gate,
    relativePath,
    absolutePath,
    extension: path.extname(relativePath).toLowerCase(),
    sizeBytes: stat.size,
    mtime: stat.mtime.toISOString(),
    contentHash: null
  };
}

export async function indexRoot(input: IndexRootInput): Promise<void> {
  const repos = createRepositories(input.db);
  const productions = await detectProductions(input.root);

  for (const production of productions) {
    const artifacts = await Promise.all(
      production.files.map((file) => artifactFromPath(input.root, production.id, file))
    );
    const lastMtime = artifacts.map((artifact) => artifact.mtime).sort().at(-1) ?? null;

    repos.productions.upsert({
      id: production.id,
      storyName: production.storyName,
      productionPath: production.productionPath,
      absolutePath: production.absolutePath,
      detectionType: production.detectionType,
      lastContentMtime: lastMtime
    });
    repos.artifacts.replaceForProduction(production.id, artifacts);

    const parsedScenes = [];
    const parsedTasks = [];
    const parsedApprovals = [];

    for (const artifact of artifacts) {
      if (artifact.extension === ".md") {
        const markdown = await fs.readFile(artifact.absolutePath, "utf8");
        const scenes = parseMarkdownScenes(markdown, artifact.relativePath);
        for (const scene of scenes) {
          parsedScenes.push({
            id: stableId(`scene:${artifact.id}:${scene.sceneKey}:${scene.lineNumber}`),
            sourceArtifactId: artifact.id,
            sceneKey: scene.sceneKey,
            title: scene.title,
            timeRange: scene.timeRange,
            durationSeconds: scene.durationSeconds,
            summary: scene.summary,
            lineNumber: scene.lineNumber,
            cuts: scene.cuts.map((cut) => ({
              id: stableId(`cut:${artifact.id}:${scene.sceneKey}:${cut.cutKey}:${cut.lineNumber}`),
              ...cut
            }))
          });
        }
        if (artifact.kind === "approval") {
          const approval = parseApprovalMarkdown(markdown);
          parsedApprovals.push({
            id: stableId(`approval:${artifact.id}`),
            productionId: production.id,
            artifactId: artifact.id,
            gateId: approval.gateId,
            approvalId: approval.approvalId,
            status: approval.status,
            decision: approval.decision,
            actor: approval.actor,
            decidedAt: approval.decidedAt
          });
        }
      }

      if (artifact.kind === "codex_task") {
        const task = parseCodexTask(await fs.readFile(artifact.absolutePath, "utf8"));
        parsedTasks.push({
          id: stableId(`task:${artifact.id}`),
          productionId: production.id,
          artifactId: artifact.id,
          runId: task.runId,
          gateId: task.gateId,
          taskId: task.taskId,
          title: task.title,
          status: task.status,
          expectedOutputsJson: JSON.stringify(task.expectedOutputs),
          contextPathsJson: JSON.stringify(task.contextPaths),
          createdAt: task.createdAt
        });
      }
    }

    repos.scenes.replaceForProduction(production.id, parsedScenes);
    repos.orchestrator.replaceTasks(production.id, parsedTasks);
    repos.orchestrator.replaceApprovals(production.id, parsedApprovals);
  }
}
