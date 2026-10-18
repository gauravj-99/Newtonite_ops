export type Role = "VIEWER" | "MEMBER" | "LEAD" | "ADMIN";
export type WorkStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "RESOLVED"
  | "CLOSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type WorkItemType =
  | "INCIDENT"
  | "CUSTOMER_ISSUE"
  | "PAYMENT"
  | "COMPLIANCE"
  | "TASK";

export interface Team {
  id: number;
  name: string;
  role: Role;
}

export interface User {
  userId: number;
  email: string;
}

export interface Person {
  id: number;
  name: string;
  email: string;
}

export interface WorkItem {
  id: number;
  title: string;
  description: string;
  type: WorkItemType;
  priority: Priority;
  status: WorkStatus;
  version: number;
  teamId: number;
  team?: { id: number; name: string };
  assigneeId: number | null;
  assignee?: Person | null;
  createdBy?: Person;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}

export interface ActivityEvent {
  id: number;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor: Person;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: Person;
}
