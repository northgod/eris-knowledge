import { History } from "lucide-react";
import type { ScanRunRecord } from "../../shared/types";

interface ScanHistoryProps {
  scans: ScanRunRecord[];
}

function timestampLabel(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export function ScanHistory({ scans }: ScanHistoryProps) {
  return (
    <section className="scan-history-section" aria-label="Scan History">
      <div className="scan-history-header">
        <h2><History size={18} /> スキャン履歴</h2>
        <span>{scans.length} runs</span>
      </div>
      {scans.length === 0 ? (
        <p className="quiet-text">No scan runs have been recorded.</p>
      ) : (
        <div className="scan-history-table-wrap">
          <table className="scan-history-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Root</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td><span className={`scan-status-pill scan-status-pill-${scan.status}`}>{scan.status}</span></td>
                  <td>{timestampLabel(scan.startedAt)}</td>
                  <td>{timestampLabel(scan.finishedAt)}</td>
                  <td><code>{scan.rootPath}</code></td>
                  <td>{scan.errorMessage ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
