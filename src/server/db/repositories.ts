import crypto from "node:crypto";
import type Database from "better-sqlite3";
import type {
  ApprovalRecord,
  ArtifactRecord,
  CutRecord,
  DetectionType,
  GateId,
  GateStatus,
  OrchestratorTaskRecord,
  ProductionDetailPayload,
  ScanIssueRecord,
  SceneRecord
} from "../../shared/types";

export interface ProductionUpsert {
  id: string;
  storyName: string;
  productionPath: string;
  absolutePath: string;
  detectionType: DetectionType;
  lastContentMtime: string | null;
}

export interface ArtifactUpsert {
  id: string;
  productionId: string;
  kind: string;
  gate: string | null;
  relativePath: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  mtime: string;
  contentHash: string | null;
}

export interface SceneUpsert {
  id: string;
  sourceArtifactId: string;
  sceneKey: string;
  title: string;
  timeRange: string | null;
  durationSeconds: number | null;
  summary: string | null;
  details: string | null;
  lineNumber: number;
  cuts: Array<{
    id: string;
    cutKey: string;
    timeRange: string | null;
    durationSeconds: number | null;
    cameraLabel: string | null;
    summary: string | null;
    dialogue: string | null;
    details: string | null;
    lineNumber: number;
  }>;
}

export interface ScanIssueUpsert {
  id: string;
  scanRunId: string | null;
  severity: string;
  relativePath: string;
  issueCode: string;
  message: string;
}

export function stableId(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}
interface ProductionIssueScope {
  storyName: string;
  productionPath: string;
}

function normalizePathForMatch(value: string): string {
  return value.replace(/\\/g, "/");
}

function issueBelongsToProduction(relativePath: string, production: ProductionIssueScope): boolean {
  const normalizedPath = normalizePathForMatch(relativePath);
  const productionPath = normalizePathForMatch(production.productionPath);
  const storyName = normalizePathForMatch(production.storyName);
  const roots = [
    productionPath,
    `stories/${storyName}/02_Anime/storyboards/${productionPath}`
  ];

  return roots.some((root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`));
}

function listScanIssues(db: Database.Database): ScanIssueRecord[] {
  return db.prepare(`
    SELECT
      id,
      scan_run_id AS scanRunId,
      severity,
      relative_path AS relativePath,
      issue_code AS issueCode,
      message
    FROM scan_issues
    ORDER BY relative_path, issue_code, id
  `).all() as ScanIssueRecord[];
}

function scanIssuesForProduction(db: Database.Database, production: ProductionIssueScope): ScanIssueRecord[] {
  return listScanIssues(db).filter((issue) => issueBelongsToProduction(issue.relativePath, production));
}

function parseJsonStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function listOrchestratorTasks(db: Database.Database, productionId: string): OrchestratorTaskRecord[] {
  const rows = db.prepare(`
    SELECT
      id,
      production_id AS productionId,
      artifact_id AS artifactId,
      run_id AS runId,
      gate_id AS gateId,
      task_id AS taskId,
      title,
      status,
      expected_outputs_json AS expectedOutputsJson,
      context_paths_json AS contextPathsJson,
      created_at AS createdAt
    FROM orchestrator_tasks
    WHERE production_id = ?
    ORDER BY gate_id, created_at, task_id, id
  `).all(productionId) as Array<Omit<OrchestratorTaskRecord, "expectedOutputs" | "contextPaths"> & {
    expectedOutputsJson: string;
    contextPathsJson: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    productionId: row.productionId,
    artifactId: row.artifactId,
    runId: row.runId,
    gateId: row.gateId,
    taskId: row.taskId,
    title: row.title,
    status: row.status,
    expectedOutputs: parseJsonStringArray(row.expectedOutputsJson),
    contextPaths: parseJsonStringArray(row.contextPathsJson),
    createdAt: row.createdAt
  }));
}

function listApprovals(db: Database.Database, productionId: string): ApprovalRecord[] {
  return db.prepare(`
    SELECT
      id,
      production_id AS productionId,
      artifact_id AS artifactId,
      gate_id AS gateId,
      approval_id AS approvalId,
      status,
      decision,
      actor,
      decided_at AS decidedAt
    FROM approvals
    WHERE production_id = ?
    ORDER BY gate_id, decided_at, approval_id, id
  `).all(productionId) as ApprovalRecord[];
}
export function createRepositories(db: Database.Database) {
  return {
    productions: {
      upsert(input: ProductionUpsert) {
        db.prepare(`
          INSERT INTO productions (
            id, story_name, production_path, absolute_path, detection_type, last_content_mtime
          ) VALUES (
            @id, @storyName, @productionPath, @absolutePath, @detectionType, @lastContentMtime
          )
          ON CONFLICT(id) DO UPDATE SET
            story_name = excluded.story_name,
            production_path = excluded.production_path,
            absolute_path = excluded.absolute_path,
            detection_type = excluded.detection_type,
            last_content_mtime = excluded.last_content_mtime,
            last_seen_at = CURRENT_TIMESTAMP
        `).run(input);
      },
      list() {
        return db.prepare("SELECT * FROM productions ORDER BY story_name, production_path").all();
      },
      listForApi() {
        const rows = db.prepare(`
          SELECT
            id,
            story_name AS storyName,
            production_path AS productionPath,
            absolute_path AS absolutePath,
            detection_type AS detectionType,
            last_content_mtime AS lastContentMtime
          FROM productions
          ORDER BY story_name, production_path
        `).all() as Array<{
          id: string;
          storyName: string;
          productionPath: string;
          absolutePath: string;
          detectionType: DetectionType;
          lastContentMtime: string | null;
        }>;

        const gateRows = db.prepare(`
          SELECT gate, COUNT(*) AS count
          FROM artifacts
          WHERE production_id = ? AND gate IS NOT NULL
          GROUP BY gate
        `);
        const countByKind = db.prepare(`
          SELECT kind, COUNT(*) AS count
          FROM artifacts
          WHERE production_id = ?
          GROUP BY kind
        `);
        const sceneCount = db.prepare("SELECT COUNT(*) AS count FROM scenes WHERE production_id = ?");
        const cutCount = db.prepare(`
          SELECT COUNT(*) AS count
          FROM cuts
          WHERE scene_id IN (SELECT id FROM scenes WHERE production_id = ?)
        `);
        const approvalCount = db.prepare("SELECT COUNT(*) AS count FROM approvals WHERE production_id = ?");
        const scanIssues = listScanIssues(db);
        const manualStatus = db.prepare(`
          SELECT checked FROM manual_statuses WHERE target_type = 'production' AND target_id = ?
        `);
        const tags = db.prepare(`
          SELECT tags.name
          FROM tags
          JOIN taggings ON taggings.tag_id = tags.id
          WHERE taggings.target_type = 'production' AND taggings.target_id = ?
          ORDER BY tags.name
        `);

        return rows.map((row) => {
          const gates: Record<GateId, GateStatus> = {
            G0: "missing",
            G1: "missing",
            G2: "missing",
            G3: "missing",
            G4: "missing"
          };
          for (const gateRow of gateRows.all(row.id) as Array<{ gate: GateId; count: number }>) {
            if (gateRow.gate in gates && gateRow.count > 0) gates[gateRow.gate] = "detected";
          }
          const kindCounts = Object.fromEntries(
            (countByKind.all(row.id) as Array<{ kind: string; count: number }>).map((item) => [
              item.kind,
              item.count
            ])
          ) as Record<string, number>;
          const checkedRow = manualStatus.get(row.id) as { checked: number } | undefined;

          return {
            ...row,
            gates,
            sceneCount: (sceneCount.get(row.id) as { count: number }).count,
            cutCount: (cutCount.get(row.id) as { count: number }).count,
            storyboardSheetCount: kindCounts.storyboard_sheet ?? 0,
            videoPromptCount: kindCounts.video_prompt ?? 0,
            generatedVideoCount: kindCounts.generated_video ?? 0,
            approvalCount: (approvalCount.get(row.id) as { count: number }).count,
            issueCount: scanIssues.filter((issue) => issueBelongsToProduction(issue.relativePath, row)).length,
            checked: Boolean(checkedRow?.checked),
            tags: (tags.all(row.id) as Array<{ name: string }>).map((tag) => tag.name)
          };
        });
      }
    },
    artifacts: {
      replaceForProduction(productionId: string, artifacts: ArtifactUpsert[]) {
        const tx = db.transaction(() => {
          db.prepare("DELETE FROM artifacts WHERE production_id = ?").run(productionId);
          const insert = db.prepare(`
            INSERT INTO artifacts (
              id, production_id, kind, gate, relative_path, absolute_path,
              extension, size_bytes, mtime, content_hash
            ) VALUES (
              @id, @productionId, @kind, @gate, @relativePath, @absolutePath,
              @extension, @sizeBytes, @mtime, @contentHash
            )
          `);
          for (const artifact of artifacts) insert.run(artifact);
        });
        tx();
      }
    },
    scenes: {
      replaceForProduction(productionId: string, scenes: SceneUpsert[]) {
        const tx = db.transaction(() => {
          const existing = db.prepare("SELECT id FROM scenes WHERE production_id = ?").all(productionId) as Array<{ id: string }>;
          const deleteCuts = db.prepare("DELETE FROM cuts WHERE scene_id = ?");
          for (const row of existing) deleteCuts.run(row.id);
          db.prepare("DELETE FROM scenes WHERE production_id = ?").run(productionId);
          const insertScene = db.prepare(`
            INSERT INTO scenes (
              id, production_id, source_artifact_id, scene_key, title, time_range,
              duration_seconds, summary, details, line_number
            ) VALUES (
              @id, @productionId, @sourceArtifactId, @sceneKey, @title, @timeRange,
              @durationSeconds, @summary, @details, @lineNumber
            )
          `);
          const insertCut = db.prepare(`
            INSERT INTO cuts (
              id, scene_id, cut_key, time_range, duration_seconds, camera_label,
              summary, dialogue, details, line_number
            ) VALUES (
              @id, @sceneId, @cutKey, @timeRange, @durationSeconds, @cameraLabel,
              @summary, @dialogue, @details, @lineNumber
            )
          `);
          for (const scene of scenes) {
            insertScene.run({ ...scene, productionId });
            for (const cut of scene.cuts) insertCut.run({ ...cut, sceneId: scene.id });
          }
        });
        tx();
      }
    },
    orchestrator: {
      replaceTasks(productionId: string, rows: Array<Record<string, unknown>>) {
        const tx = db.transaction(() => {
          db.prepare("DELETE FROM orchestrator_tasks WHERE production_id = ?").run(productionId);
          const insert = db.prepare(`
            INSERT INTO orchestrator_tasks (
              id, production_id, artifact_id, run_id, gate_id, task_id, title,
              status, expected_outputs_json, context_paths_json, created_at
            ) VALUES (
              @id, @productionId, @artifactId, @runId, @gateId, @taskId, @title,
              @status, @expectedOutputsJson, @contextPathsJson, @createdAt
            )
          `);
          for (const row of rows) insert.run(row);
        });
        tx();
      },
      replaceApprovals(productionId: string, rows: Array<Record<string, unknown>>) {
        const tx = db.transaction(() => {
          db.prepare("DELETE FROM approvals WHERE production_id = ?").run(productionId);
          const insert = db.prepare(`
            INSERT INTO approvals (
              id, production_id, artifact_id, gate_id, approval_id, status,
              decision, actor, decided_at
            ) VALUES (
              @id, @productionId, @artifactId, @gateId, @approvalId, @status,
              @decision, @actor, @decidedAt
            )
          `);
          for (const row of rows) insert.run(row);
        });
        tx();
      }
    },
    manual: {
      upsertNote(input: { targetType: string; targetId: string; note: string }) {
        db.prepare(`
          INSERT INTO manual_notes (id, target_type, target_id, note, updated_at)
          VALUES (@id, @targetType, @targetId, @note, CURRENT_TIMESTAMP)
          ON CONFLICT(target_type, target_id) DO UPDATE SET
            note = excluded.note,
            updated_at = CURRENT_TIMESTAMP
        `).run({
          id: stableId(`note:${input.targetType}:${input.targetId}`),
          ...input
        });
      },
      getNote(targetType: string, targetId: string): string | null {
        const row = db
          .prepare("SELECT note FROM manual_notes WHERE target_type = ? AND target_id = ?")
          .get(targetType, targetId) as { note: string } | undefined;
        return row?.note ?? null;
      },
      upsertStatus(input: { targetType: string; targetId: string; status: string; priority: string; checked: boolean }) {
        db.prepare(`
          INSERT INTO manual_statuses (id, target_type, target_id, status, priority, checked, updated_at)
          VALUES (@id, @targetType, @targetId, @status, @priority, @checked, CURRENT_TIMESTAMP)
          ON CONFLICT(target_type, target_id) DO UPDATE SET
            status = excluded.status,
            priority = excluded.priority,
            checked = excluded.checked,
            updated_at = CURRENT_TIMESTAMP
        `).run({
          id: stableId(`status:${input.targetType}:${input.targetId}`),
          ...input,
          checked: input.checked ? 1 : 0
        });
      }
    },
    tags: {
      upsert(input: { name: string; color: string }) {
        const id = stableId(`tag:${input.name}`);
        db.prepare(`
          INSERT INTO tags (id, name, color) VALUES (@id, @name, @color)
          ON CONFLICT(name) DO UPDATE SET color = excluded.color
        `).run({ id, ...input });
        return id;
      },
      tag(input: { tagId: string; targetType: string; targetId: string }) {
        db.prepare(`
          INSERT OR IGNORE INTO taggings (tag_id, target_type, target_id)
          VALUES (@tagId, @targetType, @targetId)
        `).run(input);
      },
      untag(input: { tagId: string; targetType: string; targetId: string }) {
        db.prepare(`
          DELETE FROM taggings WHERE tag_id = @tagId AND target_type = @targetType AND target_id = @targetId
        `).run(input);
      }
    },
    scanIssues: {
      replaceAll(issues: ScanIssueUpsert[]) {
        const tx = db.transaction(() => {
          db.prepare("DELETE FROM scan_issues").run();
          const insert = db.prepare(`
            INSERT INTO scan_issues (id, scan_run_id, severity, relative_path, issue_code, message)
            VALUES (@id, @scanRunId, @severity, @relativePath, @issueCode, @message)
          `);
          for (const issue of issues) insert.run(issue);
        });
        tx();
      }
    },
    api: {
      artifacts(): ArtifactRecord[] {
        return db.prepare(`
          SELECT
            id,
            production_id AS productionId,
            kind,
            gate,
            relative_path AS relativePath,
            absolute_path AS absolutePath,
            extension,
            size_bytes AS sizeBytes,
            mtime,
            content_hash AS contentHash
          FROM artifacts
          ORDER BY kind, relative_path
        `).all() as ArtifactRecord[];
      },
      artifactById(assetId: string): ArtifactRecord | null {
        const asset = db.prepare(`
          SELECT
            id,
            production_id AS productionId,
            kind,
            gate,
            relative_path AS relativePath,
            absolute_path AS absolutePath,
            extension,
            size_bytes AS sizeBytes,
            mtime,
            content_hash AS contentHash
          FROM artifacts
          WHERE id = ?
        `).get(assetId) as ArtifactRecord | undefined;
        return asset ?? null;
      },
      productionDetail(productionId: string): ProductionDetailPayload | null {
        const production = createRepositories(db).productions.listForApi().find((item) => item.id === productionId);
        if (!production) return null;

        const artifacts = db.prepare(`
          SELECT
            id,
            production_id AS productionId,
            kind,
            gate,
            relative_path AS relativePath,
            absolute_path AS absolutePath,
            extension,
            size_bytes AS sizeBytes,
            mtime,
            content_hash AS contentHash
          FROM artifacts
          WHERE production_id = ?
          ORDER BY gate, kind, relative_path
        `).all(productionId) as ArtifactRecord[];
        const sceneRows = db.prepare(`
          SELECT
            id,
            production_id AS productionId,
            source_artifact_id AS sourceArtifactId,
            scene_key AS sceneKey,
            title,
            time_range AS timeRange,
            duration_seconds AS durationSeconds,
            summary,
            details,
            line_number AS lineNumber
          FROM scenes
          WHERE production_id = ?
          ORDER BY line_number, scene_key
        `).all(productionId) as SceneRecord[];
        const cutRows = db.prepare(`
          SELECT
            id,
            scene_id AS sceneId,
            cut_key AS cutKey,
            time_range AS timeRange,
            duration_seconds AS durationSeconds,
            camera_label AS cameraLabel,
            summary,
            dialogue,
            details,
            line_number AS lineNumber
          FROM cuts
          WHERE scene_id IN (SELECT id FROM scenes WHERE production_id = ?)
          ORDER BY line_number, cut_key
        `).all(productionId) as CutRecord[];
        const cutsByScene = new Map<string, CutRecord[]>();
        for (const cut of cutRows) {
          const cuts = cutsByScene.get(cut.sceneId) ?? [];
          cuts.push(cut);
          cutsByScene.set(cut.sceneId, cuts);
        }

        return {
          production,
          scenes: sceneRows.map((scene) => ({ ...scene, cuts: cutsByScene.get(scene.id) ?? [] })),
          artifacts,
          manualNote: createRepositories(db).manual.getNote("production", productionId),
          issues: scanIssuesForProduction(db, production),
          orchestratorTasks: listOrchestratorTasks(db, productionId),
          approvals: listApprovals(db, productionId)
        };
      }
    }
  };
}

