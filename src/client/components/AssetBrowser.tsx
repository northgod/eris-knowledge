import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ArtifactRecord } from "../../shared/types";

interface AssetBrowserProps {
  assets: ArtifactRecord[];
}

function uniqueSorted(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

export function AssetBrowser({ assets }: AssetBrowserProps) {
  const [productionFilter, setProductionFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [gateFilter, setGateFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const productions = useMemo(() => uniqueSorted(assets.map((asset) => asset.productionId)), [assets]);
  const kinds = useMemo(() => uniqueSorted(assets.map((asset) => asset.kind)), [assets]);
  const gates = useMemo(() => uniqueSorted(assets.map((asset) => asset.gate)), [assets]);

  const filteredAssets = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesProduction = productionFilter === "all" || asset.productionId === productionFilter;
      const matchesKind = kindFilter === "all" || asset.kind === kindFilter;
      const matchesGate = gateFilter === "all" || asset.gate === gateFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        asset.relativePath.toLowerCase().includes(normalizedSearch) ||
        asset.kind.toLowerCase().includes(normalizedSearch) ||
        asset.productionId.toLowerCase().includes(normalizedSearch);
      return matchesProduction && matchesKind && matchesGate && matchesSearch;
    });
  }, [assets, gateFilter, kindFilter, productionFilter, searchText]);

  return (
    <section className="asset-section">
      <div className="asset-section-header">
        <h2>Assets</h2>
        <span>{`Showing ${filteredAssets.length} of ${assets.length} assets`}</span>
      </div>
      <div className="asset-filters">
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
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => (
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

