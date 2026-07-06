import type Database from "better-sqlite3";

function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string): void {
  const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  if (columns.some((item) => item.name === column)) return;
  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

export function migrate(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS productions (
      id TEXT PRIMARY KEY,
      story_name TEXT NOT NULL,
      production_path TEXT NOT NULL,
      absolute_path TEXT NOT NULL,
      detection_type TEXT NOT NULL,
      latest_scan_run_id TEXT,
      first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_content_mtime TEXT
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      production_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      gate TEXT,
      relative_path TEXT NOT NULL,
      absolute_path TEXT NOT NULL,
      extension TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mtime TEXT NOT NULL,
      content_hash TEXT,
      detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_id) REFERENCES productions(id)
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      production_id TEXT NOT NULL,
      source_artifact_id TEXT NOT NULL,
      scene_key TEXT NOT NULL,
      title TEXT NOT NULL,
      time_range TEXT,
      duration_seconds REAL,
      summary TEXT,
      details TEXT,
      line_number INTEGER NOT NULL,
      FOREIGN KEY (production_id) REFERENCES productions(id)
    );

    CREATE TABLE IF NOT EXISTS cuts (
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      cut_key TEXT NOT NULL,
      time_range TEXT,
      duration_seconds REAL,
      camera_label TEXT,
      summary TEXT,
      dialogue TEXT,
      details TEXT,
      line_number INTEGER NOT NULL,
      FOREIGN KEY (scene_id) REFERENCES scenes(id)
    );

    CREATE TABLE IF NOT EXISTS orchestrator_tasks (
      id TEXT PRIMARY KEY,
      production_id TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      run_id TEXT,
      gate_id TEXT,
      task_id TEXT,
      title TEXT,
      status TEXT,
      expected_outputs_json TEXT NOT NULL,
      context_paths_json TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY (production_id) REFERENCES productions(id)
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      production_id TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      gate_id TEXT,
      approval_id TEXT,
      status TEXT,
      decision TEXT,
      actor TEXT,
      decided_at TEXT,
      FOREIGN KEY (production_id) REFERENCES productions(id)
    );

    CREATE TABLE IF NOT EXISTS manual_statuses (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      checked INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS manual_notes (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      note TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS taggings (
      tag_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      PRIMARY KEY(tag_id, target_type, target_id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );

    CREATE TABLE IF NOT EXISTS scan_issues (
      id TEXT PRIMARY KEY,
      scan_run_id TEXT,
      severity TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      issue_code TEXT NOT NULL,
      message TEXT NOT NULL
    );
  `);

  addColumnIfMissing(db, "scenes", "details", "TEXT");
  addColumnIfMissing(db, "cuts", "details", "TEXT");
}
