import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ArtifactRecord,
  AssetPreviewPayload,
  ProductionDetailPayload,
  ProductionSummary,
  ScanRunRecord
} from "../shared/types";
import {
  addProductionTag,
  fetchAssetPreview,
  fetchAssets,
  fetchLatestScan,
  fetchProductionDetail,
  fetchProductions,
  runScan,
  saveManualNote,
  saveManualStatus
} from "./api";
import { AssetBrowser } from "./components/AssetBrowser";
import { Dashboard } from "./components/Dashboard";
import { NeedsAttention } from "./components/NeedsAttention";
import { ProductionInsightPanel } from "./components/ProductionInsightPanel";
import { ProductionList } from "./components/ProductionList";

function appendUniqueTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags : [...tags, tag];
}

const productionRoutePrefix = "/productions/";

function productionRoute(productionId: string): string {
  return `${productionRoutePrefix}${encodeURIComponent(productionId)}`;
}

function productionIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(productionRoutePrefix)) {
    return null;
  }

  const encodedId = pathname.slice(productionRoutePrefix.length);
  if (!encodedId) {
    return null;
  }

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return null;
  }
}

function scanTimeLabel(scan: ScanRunRecord): string {
  const timestamp = scan.finishedAt ?? scan.startedAt;
  return new Date(timestamp).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export function App() {
  const [productions, setProductions] = useState<ProductionSummary[]>([]);
  const [assets, setAssets] = useState<ArtifactRecord[]>([]);
  const [latestScan, setLatestScan] = useState<ScanRunRecord | null | undefined>(undefined);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
  const [routeProductionId, setRouteProductionId] = useState<string | null>(() =>
    productionIdFromPath(window.location.pathname)
  );
  const [selectedDetail, setSelectedDetail] = useState<ProductionDetailPayload | null>(null);
  const [selectedAssetPreview, setSelectedAssetPreview] = useState<AssetPreviewPayload | null>(null);
  const [assetPreviewLoading, setAssetPreviewLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeProductionId = routeProductionId ?? selectedProductionId;
  const isDetailRoute = routeProductionId !== null;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextProductions, nextAssets, nextLatestScan] = await Promise.all([
        fetchProductions(),
        fetchAssets(),
        fetchLatestScan()
      ]);
      setProductions(nextProductions);
      setAssets(nextAssets);
      setLatestScan(nextLatestScan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function scanAndReload() {
    setLoading(true);
    setError(null);
    try {
      const scan = await runScan();
      const [nextProductions, nextAssets] = await Promise.all([fetchProductions(), fetchAssets()]);
      setProductions(nextProductions);
      setAssets(nextAssets);
      setLatestScan(scan);
      setSelectedAssetPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNote(note: string) {
    if (!activeProductionId) return;
    try {
      await saveManualNote("production", activeProductionId, note);
      setSelectedDetail((current) => (current ? { ...current, manualNote: note } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleToggleChecked(checked: boolean) {
    if (!activeProductionId) return;
    try {
      await saveManualStatus("production", activeProductionId, checked);
      setSelectedDetail((current) =>
        current ? { ...current, production: { ...current.production, checked } } : current
      );
      setProductions((current) =>
        current.map((production) =>
          production.id === activeProductionId ? { ...production, checked } : production
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleAddTag(name: string) {
    if (!activeProductionId) return;
    const tagName = name.trim();
    if (!tagName) return;

    try {
      await addProductionTag(activeProductionId, tagName);
      setSelectedDetail((current) =>
        current
          ? {
              ...current,
              production: {
                ...current.production,
                tags: appendUniqueTag(current.production.tags, tagName)
              }
            }
          : current
      );
      setProductions((current) =>
        current.map((production) =>
          production.id === activeProductionId
            ? { ...production, tags: appendUniqueTag(production.tags, tagName) }
            : production
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handlePreviewAsset(assetId: string) {
    setAssetPreviewLoading(true);
    setError(null);
    try {
      setSelectedAssetPreview(await fetchAssetPreview(assetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAssetPreviewLoading(false);
    }
  }

  function navigateToProduction(productionId: string) {
    setSelectedProductionId(productionId);
    setRouteProductionId(productionId);
    const nextPath = productionRoute(productionId);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }

  function navigateToDashboard() {
    setRouteProductionId(null);
    if (window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    function handlePopState() {
      setRouteProductionId(productionIdFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (productions.length === 0) {
      setSelectedProductionId(null);
      return;
    }
    if (!selectedProductionId || !productions.some((production) => production.id === selectedProductionId)) {
      setSelectedProductionId(productions[0].id);
    }
  }, [loading, productions, selectedProductionId]);

  useEffect(() => {
    if (!activeProductionId) {
      setSelectedDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    fetchProductionDetail(activeProductionId)
      .then((detail) => {
        if (!cancelled) setSelectedDetail(detail);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProductionId]);

  const selectedProductionPreview =
    selectedAssetPreview && selectedDetail?.artifacts.some((asset) => asset.id === selectedAssetPreview.id)
      ? selectedAssetPreview
      : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>eris-knowledge</h1>
          <p>Read-only production knowledge for ScarletEchoes</p>
        </div>
        <div className="topbar-actions">
          {latestScan !== undefined && (
            <div className={`scan-status scan-status-${latestScan?.status ?? "empty"}`} aria-label="Latest scan">
              <span>Latest scan</span>
              {latestScan ? (
                <>
                  <strong>{latestScan.status}</strong>
                  <time dateTime={latestScan.finishedAt ?? latestScan.startedAt}>{scanTimeLabel(latestScan)}</time>
                  <code>{latestScan.rootPath}</code>
                </>
              ) : (
                <strong>not run</strong>
              )}
            </div>
          )}
          <button className="icon-button" onClick={scanAndReload} aria-label="Run scan">
            <RefreshCw size={18} />
            Scan
          </button>
        </div>
      </header>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="loading">Loading</div>
      ) : isDetailRoute ? (
        <section className="production-detail-screen" aria-label="Selected Production Detail">
          <button className="secondary-button dashboard-back-button" type="button" onClick={navigateToDashboard}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <ProductionInsightPanel
            detail={selectedDetail}
            loading={detailLoading}
            selectedPreview={selectedProductionPreview}
            previewLoading={assetPreviewLoading}
            onSaveNote={handleSaveNote}
            onToggleChecked={handleToggleChecked}
            onAddTag={handleAddTag}
            onPreviewAsset={handlePreviewAsset}
          />
        </section>
      ) : (
        <>
          <Dashboard productions={productions} />
          <ProductionList
            productions={productions}
            selectedProductionId={selectedProductionId}
            onSelect={navigateToProduction}
          />
          <NeedsAttention
            productions={productions}
            selectedProductionId={selectedProductionId}
            onSelect={navigateToProduction}
          />
          <AssetBrowser
            assets={assets}
            selectedPreview={selectedAssetPreview}
            previewLoading={assetPreviewLoading}
            onPreviewAsset={handlePreviewAsset}
          />
        </>
      )}
    </main>
  );
}

