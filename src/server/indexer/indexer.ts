import fs from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import { createRepositories, stableId, type ArtifactUpsert, type ScanIssueUpsert } from "../db/repositories";
import { classifyArtifact } from "../scanner/artifactClassifier";
import { detectProductions } from "../scanner/productionDetector";
import { parseApprovalMarkdown } from "../parser/approvalParser";
import { parseMarkdownEmbeddedArtifacts, parseMarkdownScenes } from "../parser/markdownParser";
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function issueFromError(input: {
  scanRunId: string | null;
  artifact: ArtifactUpsert;
  issueCode: string;
  messagePrefix: string;
  error: unknown;
}): ScanIssueUpsert {
  return {
    id: stableId(`scan_issue:${input.issueCode}:${input.artifact.relativePath}`),
    scanRunId: input.scanRunId,
    severity: "error",
    relativePath: input.artifact.relativePath,
    issueCode: input.issueCode,
    message: `${input.messagePrefix}: ${errorMessage(input.error)}`
  };
}

export async function indexRoot(input: IndexRootInput): Promise<void> {
  const repos = createRepositories(input.db);
  const productions = await detectProductions(input.root);
  const scanIssues: ScanIssueUpsert[] = [];

  for (const production of productions) {
    const artifacts = await Promise.all(
      production.files.map((file) => artifactFromPath(input.root, production.id, file))
    );
    const sourceArtifacts = [...artifacts];
    const lastMtime = artifacts.map((artifact) => artifact.mtime).sort().at(-1) ?? null;

    repos.productions.upsert({
      id: production.id,
      storyName: production.storyName,
      productionPath: production.productionPath,
      absolutePath: production.absolutePath,
      detectionType: production.detectionType,
      lastContentMtime: lastMtime
    });

    const parsedScenes = [];
    const parsedTasks = [];
    const parsedApprovals = [];

    for (const artifact of sourceArtifacts) {
      if (artifact.extension === ".md") {
        try {
          const markdown = await fs.readFile(artifact.absolutePath, "utf8");
          if (artifact.kind !== "video_prompt") {
            for (const embedded of parseMarkdownEmbeddedArtifacts(markdown)) {
              artifacts.push({
                ...artifact,
                id: stableId(`artifact:${production.id}:${artifact.relativePath}:${embedded.kind}:${embedded.lineNumber}`),
                kind: embedded.kind,
                gate: embedded.gate,
                relativePath: `${artifact.relativePath}${embedded.fragment}`
              });
            }
          }
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
        } catch (error) {
          scanIssues.push(issueFromError({
            scanRunId: input.scanRootLabel,
            artifact,
            issueCode: "markdown_read_error",
            messagePrefix: "Markdown read error",
            error
          }));
        }
      }

      if (artifact.kind === "codex_task") {
        try {
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
        } catch (error) {
          scanIssues.push(issueFromError({
            scanRunId: input.scanRootLabel,
            artifact,
            issueCode: "json_parse_error",
            messagePrefix: "JSON parse error",
            error
          }));
        }
      }
    }

    repos.artifacts.replaceForProduction(production.id, artifacts);
    repos.scenes.replaceForProduction(production.id, parsedScenes);
    repos.orchestrator.replaceTasks(production.id, parsedTasks);
    repos.orchestrator.replaceApprovals(production.id, parsedApprovals);
  }

  repos.scanIssues.replaceAll(scanIssues);
}
