export interface ParsedApproval {
  gateId: string | null;
  approvalId: string | null;
  status: string | null;
  actor: string | null;
  decision: string | null;
  decidedAt: string | null;
}

export function parseApprovalMarkdown(markdown: string): ParsedApproval {
  const metadata: Record<string, string> = {};
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) metadata[match[1]] = match[2].trim();
  }

  return {
    gateId: metadata.gateId ?? null,
    approvalId: metadata.approvalId ?? null,
    status: metadata.status ?? null,
    actor: metadata.actor ?? null,
    decision: metadata.decision ?? null,
    decidedAt: metadata.decidedAt ?? null
  };
}
