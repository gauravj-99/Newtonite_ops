import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleUserRound,
  Clock3,
  MessageSquare,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Loading } from "../components/Loading";
import { Notice } from "../components/Notice";
import { PriorityBadge } from "../components/PriorityBadge";
import { StatusBadge } from "../components/StatusBadge";
import type { ActivityEvent, WorkItem, WorkStatus } from "../types";

const nextStatus: Partial<Record<WorkStatus, WorkStatus>> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "AWAITING_APPROVAL",
  RESOLVED: "CLOSED",
};

const eventLabel = (event: ActivityEvent) => {
  switch (event.eventType) {
    case "WORK_ITEM_CREATED": return "created this work item";
    case "WORK_ITEM_ASSIGNED": return event.newValue ? `assigned this to user #${event.newValue}` : "unassigned this work item";
    case "STATUS_CHANGED": return `changed status from ${event.oldValue ?? "—"} to ${event.newValue ?? "—"}`;
    case "PRIORITY_CHANGED": return `changed priority from ${event.oldValue ?? "—"} to ${event.newValue ?? "—"}`;
    case "COMMENT_ADDED": return "added a comment";
    default: return event.eventType.toLowerCase().replaceAll("_", " ");
  }
};

export const WorkItemDetailPage = () => {
  const { id } = useParams();
  const { user, teams } = useAuth();
  const [item, setItem] = useState<WorkItem | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const [itemResponse, activityResponse] = await Promise.all([
      api.get(`/work/items/${id}`),
      api.get(`/work/items/${id}/activity`),
    ]);
    setItem(itemResponse.data.data);
    setEvents(activityResponse.data.data);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setError("");
    load().catch((requestError: unknown) => setError(getErrorMessage(requestError))).finally(() => setLoading(false));
  }, [load]);

  const doAction = async (action: () => Promise<unknown>, message: string) => {
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      setNotice(message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      if (item) await api.get(`/work/items/${item.id}`).then((response) => setItem(response.data.data)).catch(() => undefined);
    } finally {
      setActionLoading(false);
    }
  };

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!item || !comment.trim()) return;
    const content = comment.trim();
    await doAction(() => api.post(`/work/items/${item.id}/comments`, { content }), "Comment added.");
    setComment("");
  };

  if (loading) return <Loading label="Loading work item" />;
  if (error && !item) return <div className="page-content"><Notice message={error} /><Link to="/work-items" className="back-link"><ArrowLeft size={16} /> Back to work items</Link></div>;
  if (!item) return null;

  const currentRole = teams.find((team) => team.id === item.teamId)?.role;
  const canApprove = currentRole === "LEAD" && item.status === "AWAITING_APPROVAL";
  const hasNext = nextStatus[item.status];

  return (
    <div className="page-content detail-page">
      <Link to="/work-items" className="back-link"><ArrowLeft size={16} /> Work items</Link>
      {error && <Notice message={error} onDismiss={() => setError("")} />}
      {notice && <Notice message={notice} success onDismiss={() => setNotice("")} />}
      <div className="detail-heading">
        <div className={`detail-type-icon type-${item.type.toLowerCase()}`}><ShieldCheck size={19} /></div>
        <div className="detail-title-block">
          <div className="detail-id">{item.team?.name ?? "Team"} <span>·</span> OPS-{String(item.id).padStart(4, "0")}</div>
          <h1>{item.title}</h1>
          <div className="detail-badges"><StatusBadge status={item.status} /><PriorityBadge priority={item.priority} /></div>
        </div>
        <div className="detail-actions">
          {!item.assigneeId && <button className="secondary-button" disabled={actionLoading} onClick={() => void doAction(() => api.post(`/work-items/${item.id}/claim`), "Work item claimed.")}><UserRound size={16} /> Claim item</button>}
          {hasNext && <button className="primary-button" disabled={actionLoading} onClick={() => void doAction(() => api.patch(`/work/items/${item.id}/status`, { status: hasNext }), `Status updated to ${hasNext.replaceAll("_", " ").toLowerCase()}.`)}>Move to {hasNext.replaceAll("_", " ").toLowerCase()} <ArrowRight size={16} /></button>}
          {canApprove && <button className="primary-button approve-button" disabled={actionLoading} onClick={() => void doAction(() => api.patch(`/work/items/${item.id}/status`, { status: "RESOLVED" }), "Work item approved.")}><Check size={16} /> Approve</button>}
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel detail-description">
            <div className="panel-title">Description</div>
            <p>{item.description}</p>
            <div className="description-meta">
              <div><CalendarDays size={15} /><span>Created {new Date(item.createdAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</span></div>
              <div><Clock3 size={15} /><span>Updated {new Date(item.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span></div>
            </div>
          </section>

          <section className="panel comments-panel">
            <div className="panel-heading"><div><div className="panel-title"><MessageSquare size={17} /> Discussion</div><div className="panel-subtitle">Comments are recorded in the activity timeline</div></div><span className="discussion-count">{events.filter((event) => event.eventType === "COMMENT_ADDED").length}</span></div>
            <div className="comment-stream">
              {events.filter((event) => event.eventType === "COMMENT_ADDED").length === 0 ? <div className="empty-inline">No comments yet. Start the conversation.</div> :
                events.filter((event) => event.eventType === "COMMENT_ADDED").map((event) => <div className="comment-entry" key={event.id}><div className="activity-avatar">{event.actor.name.slice(0, 1).toUpperCase()}</div><div className="comment-content"><div className="comment-meta"><strong>{event.actor.name}</strong><span>{new Date(event.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div><p>{event.newValue}</p></div></div>)}
            </div>
            <form className="comment-form" onSubmit={submitComment}><div className="activity-avatar current-avatar">{user?.email.slice(0, 1).toUpperCase() ?? "U"}</div><input aria-label="Write a comment" placeholder="Write a comment..." value={comment} onChange={(event) => setComment(event.target.value)} /><button type="submit" disabled={actionLoading || !comment.trim()} aria-label="Send comment"><Send size={16} /></button></form>
          </section>
        </div>
        <aside className="detail-side">
          <section className="panel properties-panel">
            <div className="panel-title">Properties</div>
            <div className="property-row"><span>Assignee</span>{item.assignee ? <div className="property-person"><div className="assignee-avatar">{item.assignee.name.slice(0, 1).toUpperCase()}</div>{item.assignee.name}</div> : <span className="unassigned-pill">Unassigned</span>}</div>
            <div className="property-row"><span>Team</span><strong>{item.team?.name ?? "—"}</strong></div>
            <div className="property-row"><span>Work type</span><strong>{item.type.replaceAll("_", " ")}</strong></div>
            <div className="property-row"><span>Due date</span><strong>{item.dueDate ? new Date(item.dueDate).toLocaleDateString("en", { month: "short", day: "numeric" }) : "No due date"}</strong></div>
            <div className="property-row"><span>Version</span><strong>v{item.version}</strong></div>
          </section>
          <section className="panel timeline-panel">
            <div className="panel-heading"><div><div className="panel-title">Activity</div><div className="panel-subtitle">Recent changes</div></div><span className="discussion-count">{events.length}</span></div>
            {events.length === 0 ? <div className="empty-inline">No activity recorded yet.</div> :
              <div className="timeline">{events.map((event) => <div className="timeline-entry" key={event.id}><div className="timeline-marker"><CircleUserRound size={14} /></div><div className="timeline-body"><p><strong>{event.actor.name}</strong> {eventLabel(event)}</p><time>{new Date(event.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div></div>)}</div>}
          </section>
        </aside>
      </div>
    </div>
  );
};
