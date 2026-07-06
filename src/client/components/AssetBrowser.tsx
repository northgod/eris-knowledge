import { Copy, Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ArtifactRecord, AssetPreviewPayload } from "../../shared/types";

interface AssetBrowserProps {
  assets: ArtifactRecord[];
  selectedPreview?: AssetPreviewPayload | null;
  previewLoading?: boolean;
  onPreviewAsset?: (assetId: string) => void | Promise<void>;
}

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function uniqueSorted(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function storyNameForProduction(productionId: string): string {
  return productionId.split("::")[0] || productionId;
}

function isImageAsset(asset: ArtifactRecord): boolean {
  return imageExtensions.has(asset.extension.toLowerCase()) || asset.kind === "storyboard_sheet" || asset.kind === "image";
}

function assetFileUrl(assetId: string): string {
  return `/api/assets/${encodeURIComponent(assetId)}/file`;
}

function copyTextWithDocumentCommand(text: string): void {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.left = "-9999px";
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    document.execCommand?.("copy");
  } finally {
    document.body.removeChild(textArea);
  }
}

async function copyAssetPath(asset: ArtifactRecord): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) {
      copyTextWithDocumentCommand(asset.absolutePath);
      return;
    }
    await navigator.clipboard.writeText(asset.absolutePath);
  } catch {
    copyTextWithDocumentCommand(asset.absolutePath);
  }
}

export function AssetBrowser({
  assets,
  selectedPreview = null,
  previewLoading = false,
  onPreviewAsset
}: AssetBrowserProps) {
  const [storyFilter, setStoryFilter] = useState("all");
  const [productionFilter, setProductionFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [gateFilter, setGateFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const stories = useMemo(() => uniqueSorted(assets.map((asset) => storyNameForProduction(asset.productionId))), [assets]);
  const productions = useMemo(() => uniqueSorted(assets.map((asset) => asset.productionId)), [assets]);
  const kinds = useMemo(() => uniqueSorted(assets.map((asset) => asset.kind)), [assets]);
  const gates = useMemo(() => uniqueSorted(assets.map((asset) => asset.gate)), [assets]);
  const hasAssetQuery =
    storyFilter !== "all" ||
    productionFilter !== "all" ||
    kindFilter !== "all" ||
    gateFilter !== "all" ||
    searchText.trim().length > 0;

  const filteredAssets = useMemo(() => {
    if (!hasAssetQuery) {
      return [];
    }

    const normalizedSearch = searchText.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesStory = storyFilter === "all" || storyNameForProduction(asset.productionId) === storyFilter;
      const matchesProduction = productionFilter === "all" || asset.productionId === productionFilter;
      const matchesKind = kindFilter === "all" || asset.kind === kindFilter;
      const matchesGate = gateFilter === "all" || asset.gate === gateFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        asset.relativePath.toLowerCase().includes(normalizedSearch) ||
        asset.kind.toLowerCase().includes(normalizedSearch) ||
        asset.productionId.toLowerCase().includes(normalizedSearch);
      return matchesStory && matchesProduction && matchesKind && matchesGate && matchesSearch;
    });
  }, [assets, gateFilter, hasAssetQuery, kindFilter, productionFilter, searchText, storyFilter]);

  return (
    <section className="asset-section">
      <div className="asset-section-header">
        <h2>Assets</h2>
        <span>{`Showing ${filteredAssets.length} of ${assets.length} assets`}</span>
      </div>
      <div className="asset-filters">
        <label>
          <span>Story</span>
          <select aria-label="Story" value={storyFilter} onChange={(event) => setStoryFilter(event.currentTarget.value)}>
            <option value="all">All stories</option>
            {stories.map((story) => (
              <option key={story} value={story}>{story}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Production</span>
          <select aria-label="Production" value={productionFilter} onChange={(event) => setProductionFilter(event.currentTarget.value)}>
            <option value="all">All productions</option>
            {productions.map((productionId) => (
              <option key={productionId} value={productionId}>{productionId}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Kind</span>
          <select aria-label="Kind" value={kindFilter} onChange={(event) => setKindFilter(event.currentTarget.value)}>
            <option value="all">All kinds</option>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>{kind}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Gate</span>
          <select aria-label="Gate" value={gateFilter} onChange={(event) => setGateFilter(event.currentTarget.value)}>
            <option value="all">All gates</option>
            {gates.map((gate) => (
              <option key={gate} value={gate}>{gate}</option>
            ))}
          </select>
        </label>
        <label className="asset-search-field">
          <span>Search</span>
          <div>
            <Search size={16} />
            <input
              aria-label="Search assets"
              placeholder="Search assets"
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
            />
          </div>
        </label>
      </div>
      <div className="asset-table-wrap">
        <table className="asset-table">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Gate</th>
              <th>Path</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <span className="quiet-text">
                    {hasAssetQuery ? "No assets match the current filters." : "Search or filter to show matching assets."}
                  </span>
                </td>
              </tr>
            ) : filteredAssets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.kind}</td>
                <td>{asset.gate ?? "-"}</td>
                <td className="asset-path-cell">
                  {isImageAsset(asset) && (
                    <img
                      className="asset-thumbnail"
                      src={assetFileUrl(asset.id)}
                      alt={asset.relativePath}
                      loading="lazy"
                    />
                  )}
                  <code>{asset.relativePath}</code>
                </td>
                <td>{asset.sizeBytes}</td>
                <td className="asset-action-cell">
                  <button
                    className="secondary-button asset-copy-button"
                    type="button"
                    aria-label={`Copy path for ${asset.relativePath}`}
                    onClick={() => void copyAssetPath(asset)}
                  >
                    <Copy size={14} />
                    Copy path
                  </button>
                  <button
                    className="secondary-button asset-preview-button"
                    type="button"
                    aria-label={`Preview ${asset.relativePath}`}
                    onClick={() => void onPreviewAsset?.(asset.id)}
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="asset-preview-panel" aria-live="polite">
        <h3>Read-only Preview</h3>
        {previewLoading ? (
          <p className="quiet-text">Loading preview.</p>
        ) : selectedPreview ? (
          <div className="asset-preview-content">
            <div className="asset-preview-meta">
              <span>{selectedPreview.kind}</span>
              <span>{selectedPreview.sizeBytes} bytes</span>
              <span>{selectedPreview.truncated ? "truncated" : "full preview"}</span>
            </div>
            {selectedPreview.mode === "text" ? (
              <pre>{selectedPreview.text}</pre>
            ) : (
              <p className="quiet-text">Inline preview is not available for this asset type. Use the path in the table for external review.</p>
            )}
          </div>
        ) : (
          <p className="quiet-text">Select an asset to preview text-based production material without editing source files.</p>
        )}
      </section>
    </section>
  );
}
