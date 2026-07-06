import type { ArtifactKind, GateId, GateStatus } from "../../shared/types";

interface ProgressArtifact {
  kind: ArtifactKind;
  gate: GateId | null;
}

const gates: GateId[] = ["G0", "G1", "G2", "G3", "G4"];

export function inferGateStatuses(artifacts: ProgressArtifact[]): Record<GateId, GateStatus> {
  const result = Object.fromEntries(gates.map((gate) => [gate, "missing"])) as Record<GateId, GateStatus>;

  for (const gate of gates) {
    if (artifacts.some((artifact) => artifact.gate === gate)) {
      result[gate] = "detected";
    }
  }

  return result;
}
