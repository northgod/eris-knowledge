import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { GateId, ProductionSummary } from "../../shared/types";
import { ProductionDetail } from "./ProductionDetail";

interface ProductionListProps {
  productions: ProductionSummary[];
  selectedProductionId?: string | null;
  onSelect?: (productionId: string) => void;
}

const gateIds: GateId[] = ["G0", "G1", "G2", "G3", "G4"];
const recentWindowMs = 14 * 24 * 60 * 60 * 1000;

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function gateFilterOptions(productions: ProductionSummary[]): string[] {
  const options = new Set<string>();
  for (const production of productions) {
    for (const gateId of gateIds) {
      options.add(`${gateId}:${production.gates[gateId]}`);
    }
  }

  return Array.from(options).sort((first, second) => {
    const [firstGate, firstStatus] = first.split(":");
    const [secondGate, secondStatus] = second.split(":");
    const gateDiff = gateIds.indexOf(firstGate as GateId) - gateIds.indexOf(secondGate as GateId);
    return gateDiff === 0 ? firstStatus.localeCompare(secondStatus) : gateDiff;
  });
}

function gateOptionLabel(option: string): string {
  const [gateId, status] = option.split(":");
  return `${gateId} ${status}`;
}

function matchesGateFilter(production: ProductionSummary, gateFilter: string): boolean {
  if (gateFilter === "all") {
    return true;
  }

  const [gateId, status] = gateFilter.split(":") as [GateId, string];
  return production.gates[gateId] === status;
}

function hasMissingGate(production: ProductionSummary): boolean {
  return gateIds.some((gateId) => production.gates[gateId] === "missing");
}

function contentTime(production: ProductionSummary): number | null {
  if (!production.lastContentMtime) return null;
  const time = Date.parse(production.lastContentMtime);
  return Number.isNaN(time) ? null : time;
}

function recentCutoff(productions: ProductionSummary[]): number | null {
  const times = productions
    .map(contentTime)
    .filter((time): time is number => time !== null);
  if (times.length === 0) return null;
  return Math.max(...times) - recentWindowMs;
}

function isRecentlyUpdated(production: ProductionSummary, cutoff: number | null): boolean {
  const time = contentTime(production);
  return cutoff !== null && time !== null && time >= cutoff;
}

function matchesSearch(production: ProductionSummary, searchText: string): boolean {
  const normalizedSearch = searchText.trim().toLowerCase();
  if (normalizedSearch.length === 0) {
    return true;
  }

  return [
    production.id,
    production.storyName,
    production.productionPath,
    production.absolutePath,
    production.detectionType,
    ...production.tags
  ].some((value) => value.toLowerCase().includes(normalizedSearch));
}

export function ProductionList({ productions, selectedProductionId = null, onSelect }: ProductionListProps) {
  const [storyFilter, setStoryFilter] = useState("all");
  const [detectionFilter, setDetectionFilter] = useState("all");
  const [gateFilter, setGateFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [uncheckedOnly, setUncheckedOnly] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [searchText, setSearchText] = useState("");

  const stories = useMemo(() => uniqueSorted(productions.map((production) => production.storyName)), [productions]);
  const detectionTypes = useMemo(() => uniqueSorted(productions.map((production) => production.detectionType)), [productions]);
  const gateOptions = useMemo(() => gateFilterOptions(productions), [productions]);
  const tags = useMemo(() => uniqueSorted(productions.flatMap((production) => production.tags)), [productions]);
  const recentUpdatedCutoff = useMemo(() => recentCutoff(productions), [productions]);

  const filteredProductions = useMemo(() => {
    return productions.filter((production) => {
      const matchesStory = storyFilter === "all" || production.storyName === storyFilter;
      const matchesDetection = detectionFilter === "all" || production.detectionType === detectionFilter;
      const matchesTag = tagFilter === "all" || production.tags.includes(tagFilter);
      const matchesCheckedState = !uncheckedOnly || !production.checked;
      const matchesMissingState = !missingOnly || hasMissingGate(production);
      const matchesRecentState = !recentOnly || isRecentlyUpdated(production, recentUpdatedCutoff);

      return (
        matchesStory &&
        matchesDetection &&
        matchesGateFilter(production, gateFilter) &&
        matchesTag &&
        matchesCheckedState &&
        matchesMissingState &&
        matchesRecentState &&
        matchesSearch(production, searchText)
      );
    });
  }, [detectionFilter, gateFilter, missingOnly, productions, recentOnly, recentUpdatedCutoff, searchText, storyFilter, tagFilter, uncheckedOnly]);

  return (
    <section className="production-section">
      <div className="production-section-header">
        <h2>Productions</h2>
        <span>{`Showing ${filteredProductions.length} of ${productions.length} productions`}</span>
      </div>
      <div className="production-filters">
        <label>
          <span>Story</span>
          <select
            aria-label="Filter productions by story"
            value={storyFilter}
            onChange={(event) => setStoryFilter(event.currentTarget.value)}
          >
            <option value="all">All stories</option>
            {stories.map((storyName) => (
              <option key={storyName} value={storyName}>{storyName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Detection</span>
          <select
            aria-label="Filter productions by detection type"
            value={detectionFilter}
            onChange={(event) => setDetectionFilter(event.currentTarget.value)}
          >
            <option value="all">All detection types</option>
            {detectionTypes.map((detectionType) => (
              <option key={detectionType} value={detectionType}>{detectionType}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Gate status</span>
          <select
            aria-label="Filter productions by gate status"
            value={gateFilter}
            onChange={(event) => setGateFilter(event.currentTarget.value)}
          >
            <option value="all">All gate statuses</option>
            {gateOptions.map((gateOption) => (
              <option key={gateOption} value={gateOption}>{gateOptionLabel(gateOption)}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Tag</span>
          <select
            aria-label="Filter productions by tag"
            value={tagFilter}
            onChange={(event) => setTagFilter(event.currentTarget.value)}
          >
            <option value="all">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </label>
        <label className="production-check-filter">
          <input
            type="checkbox"
            checked={uncheckedOnly}
            onChange={(event) => setUncheckedOnly(event.currentTarget.checked)}
          />
          <span>Show unchecked only</span>
        </label>
        <label className="production-check-filter">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(event) => setMissingOnly(event.currentTarget.checked)}
          />
          <span>Show productions with missing gates only</span>
        </label>
        <label className="production-check-filter">
          <input
            type="checkbox"
            checked={recentOnly}
            onChange={(event) => setRecentOnly(event.currentTarget.checked)}
          />
          <span>Show recently updated only</span>
        </label>
        <label className="production-search-field">
          <span>Search</span>
          <div>
            <Search size={16} />
            <input
              aria-label="Search productions"
              placeholder="Search productions"
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
            />
          </div>
        </label>
      </div>
      {filteredProductions.length > 0 ? (
        <div className="production-grid">
          {filteredProductions.map((production) => (
            <ProductionDetail
              key={production.id}
              production={production}
              selected={production.id === selectedProductionId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p className="quiet-text">No productions match the current filters.</p>
      )}
    </section>
  );
}
