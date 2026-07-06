export interface ParsedCut {
  cutKey: string;
  timeRange: string | null;
  durationSeconds: number | null;
  cameraLabel: string | null;
  summary: string | null;
  dialogue: string | null;
  lineNumber: number;
}

export interface ParsedScene {
  sceneKey: string;
  title: string;
  timeRange: string | null;
  durationSeconds: number | null;
  summary: string | null;
  lineNumber: number;
  cuts: ParsedCut[];
}

const sceneHeading = /^(#{1,3})\s*(?:シーン|Scene)\s+([0-9０-９]+(?:-[0-9０-９]+)?)(.*)$/i;
const cutPatterns = [
  /^\s*-?\s*CUT\s*([0-9０-９]+)\s*\[([0-9:.０-９]+-[0-9:.０-９]+)\]\s*([^:：]*)[:：]?/i,
  /^\s*#{2,4}\s*CUT\s*([0-9０-９]+)\s*[:：]?\s*([0-9:.０-９]+-[0-9:.０-９]+)?\s*\/?\s*([^:：]*)/i,
  /^\s*CUT\s*([0-9０-９]+)\s*[:：]\s*([0-9:.０-９]+-[0-9:.０-９]+)\s*([^:：]*)/i
];

function normalizeDigits(value: string): string {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

function normalizeTimeRange(value: string | undefined): string | null {
  if (!value) return null;
  return normalizeDigits(value).replaceAll(".", ":");
}

function durationFromRange(range: string | null): number | null {
  if (!range) return null;
  const [start, end] = range.split("-");
  const toSeconds = (time: string) => {
    const parts = time.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return Number.NaN;
  };
  const startSeconds = toSeconds(start);
  const endSeconds = toSeconds(end);
  if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) return null;
  return Math.max(0, endSeconds - startSeconds);
}

function extractSceneFromFileName(filePath: string): ParsedScene | null {
  const match = filePath.match(/scene[_-]?([0-9]+(?:-[0-9]+)?)/i);
  if (!match) return null;
  return {
    sceneKey: match[1],
    title: `Scene ${match[1]}`,
    timeRange: null,
    durationSeconds: null,
    summary: null,
    lineNumber: 1,
    cuts: []
  };
}

function appendFieldValue(current: string | null, value: string): string {
  return current ? `${current}\n${value}` : value;
}

export function parseMarkdownScenes(markdown: string, sourcePath: string): ParsedScene[] {
  const lines = markdown.split(/\r?\n/);
  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let currentCut: ParsedCut | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sceneMatch = line.match(sceneHeading);
    if (sceneMatch) {
      current = {
        sceneKey: normalizeDigits(sceneMatch[2]),
        title: line.replace(/^#+\s*/, "").trim(),
        timeRange: null,
        durationSeconds: null,
        summary: null,
        lineNumber: index + 1,
        cuts: []
      };
      scenes.push(current);
      currentCut = null;
      continue;
    }

    if (!current && /^#\s*Scene\s+[0-9]/i.test(line)) {
      const inferred = extractSceneFromFileName(sourcePath);
      current = inferred ?? {
        sceneKey: "unknown",
        title: line.replace(/^#+\s*/, "").trim(),
        timeRange: null,
        durationSeconds: null,
        summary: null,
        lineNumber: index + 1,
        cuts: []
      };
      current.title = line.replace(/^#+\s*/, "").trim();
      scenes.push(current);
      currentCut = null;
      continue;
    }

    if (!current) continue;

    if (currentCut) {
      const cutSummaryMatch = line.match(/^\s*-\s*(?:画面|映像|内容|アクション|プロンプト|Prompt)[:：]\s*(.+)$/i);
      if (cutSummaryMatch) {
        currentCut.summary = appendFieldValue(currentCut.summary, cutSummaryMatch[1].trim());
        continue;
      }

      const dialogueMatch = line.match(/^\s*-\s*(?:セリフ|台詞|Dialogue)[:：]\s*(.+)$/i);
      if (dialogueMatch) {
        currentCut.dialogue = appendFieldValue(currentCut.dialogue, dialogueMatch[1].trim());
        continue;
      }
    }

    const timeMatch = line.match(/^\s*-\s*時間[:：]\s*([0-9:.０-９]+-[0-9:.０-９]+)/);
    if (timeMatch) {
      current.timeRange = normalizeTimeRange(timeMatch[1]);
      current.durationSeconds = durationFromRange(current.timeRange);
    }

    const summaryMatch = line.match(/^\s*-\s*内容[:：]\s*(.+)$/);
    if (summaryMatch) {
      current.summary = summaryMatch[1].trim();
    }

    let matchedCut = false;
    for (const pattern of cutPatterns) {
      const cutMatch = line.match(pattern);
      if (!cutMatch) continue;
      const timeRange = normalizeTimeRange(cutMatch[2]);
      const cut: ParsedCut = {
        cutKey: normalizeDigits(cutMatch[1]),
        timeRange,
        durationSeconds: durationFromRange(timeRange),
        cameraLabel: (cutMatch[3] ?? "").trim() || null,
        summary: null,
        dialogue: null,
        lineNumber: index + 1
      };
      current.cuts.push(cut);
      currentCut = cut;
      matchedCut = true;
      break;
    }
    if (matchedCut) continue;
  }

  return scenes;
}
