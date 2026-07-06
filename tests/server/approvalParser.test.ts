import { describe, expect, it } from "vitest";
import { parseApprovalMarkdown } from "../../src/server/parser/approvalParser";

describe("parseApprovalMarkdown", () => {
  it("extracts metadata bullets from approval markdown", () => {
    const parsed = parseApprovalMarkdown(`# G1

## Metadata
- gateId: G1
- approvalId: abc
- status: approved
- actor: dashboard
- decision: approved
- decidedAt: 2026-07-06T00:00:00.000Z
`);

    expect(parsed).toEqual({
      gateId: "G1",
      approvalId: "abc",
      status: "approved",
      actor: "dashboard",
      decision: "approved",
      decidedAt: "2026-07-06T00:00:00.000Z"
    });
  });
});
