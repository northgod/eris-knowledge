import type { ArtifactRecord } from "../../shared/types";

interface AssetBrowserProps {
  assets: ArtifactRecord[];
}

export function AssetBrowser({ assets }: AssetBrowserProps) {
  return (
    <section className="asset-section">
      <h2>Assets</h2>
      <div className="asset-table-wrap">
        <table className="asset-table">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Gate</th>
              <th>Path</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.kind}</td>
                <td>{asset.gate ?? "-"}</td>
                <td><code>{asset.relativePath}</code></td>
                <td>{asset.sizeBytes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
