import type { Priority } from "../types";

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <span className={`priority-badge priority-${priority.toLowerCase()}`}>
    <span className="priority-mark" />
    {priority[0] + priority.slice(1).toLowerCase()}
  </span>
);
