import type { WorkStatus } from "../types";

const labels: Record<WorkStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  AWAITING_APPROVAL: "Awaiting approval",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const StatusBadge = ({ status }: { status: WorkStatus }) => (
  <span className={`status-badge status-${status.toLowerCase()}`}>
    <span className="status-dot" />
    {labels[status]}
  </span>
);
