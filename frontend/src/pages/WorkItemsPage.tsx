import {
  ArrowDownUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Filter,
  ListFilter,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";
import { api, getErrorMessage } from "../api/client";
import { getAllTeamWorkItems } from "../api/workItems";
import { useAuth } from "../auth/AuthContext";
import { Loading } from "../components/Loading";
import { Notice } from "../components/Notice";
import { PriorityBadge } from "../components/PriorityBadge";
import { StatusBadge } from "../components/StatusBadge";
import type { Priority, WorkItem, WorkStatus } from "../types";

const PAGE_SIZE = 10;

export const WorkItemsPage = () => {
  const { teams, user, activeTeamId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newType, setNewType] = useState("TASK");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const statusFilter = searchParams.get("status") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "";
  const viewFilter = searchParams.get("view") ?? "";
  const unassignedFilter = searchParams.get("unassigned") === "true";
  const assigneeFilter = searchParams.get("assigneeId") ?? "";
  const writableTeams = useMemo(() => teams.filter((team) => team.role !== "VIEWER"), [teams]);
  const canCreate = writableTeams.length > 0;
  const scopedTeams = useMemo(
    () => activeTeamId === null ? teams : teams.filter((team) => team.id === activeTeamId),
    [teams, activeTeamId]
  );

  useEffect(() => setSearch(searchParams.get("search") ?? ""), [searchParams]);
  useEffect(() => {
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);
  useEffect(() => {
    if (!newTeamId && writableTeams.length > 0) {
      const selectedTeam = writableTeams.find((team) => team.id === activeTeamId) ?? writableTeams[0];
      setNewTeamId(String(selectedTeam.id));
    }
  }, [newTeamId, writableTeams, activeTeamId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const allItems = await getAllTeamWorkItems(
          scopedTeams.map((team) => team.id),
          {
            search: search.trim() || undefined,
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
            assigneeId: assigneeFilter || undefined,
          }
        );
        if (active) setItems(allItems);
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [scopedTeams, search, statusFilter, priorityFilter, assigneeFilter]);

  const filtered = useMemo(() => items.filter((item) => {
    if (viewFilter === "assigned" && item.assigneeId !== user?.userId) return false;
    if (viewFilter === "approval" && !teams.some((team) => team.id === item.teamId && team.role === "LEAD")) return false;
    if (unassignedFilter && item.assigneeId !== null) return false;
    return true;
  }), [items, viewFilter, unassignedFilter, user, teams]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
    setPage(1);
  };

  const submitNewWorkItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTeamId) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      const response = await api.post(`/work/teams/${newTeamId}/items`, {
        title: newTitle,
        description: newDescription,
        type: newType,
        priority: newPriority,
      });
      setCreateOpen(false);
      navigate(`/work-items/${response.data.data.id}`);
    } catch (requestError) {
      setCreateError(getErrorMessage(requestError));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> OPERATIONS</div><h1>Work items</h1><p className="page-subtitle">Track, prioritize, and move your team's work forward.</p></div>
        <div className="list-title-actions"><span className="total-count"><span className="count-dot" />{filtered.length} items</span>{canCreate && <button className="primary-button" onClick={() => setCreateOpen(true)}><CirclePlus size={15} /> New work item</button>}</div>
      </div>
      {error && <Notice message={error} onDismiss={() => setError("")} />}
      <section className="panel work-list-panel">
        <div className="list-toolbar">
          <div className="list-toolbar-title"><ListFilter size={17} /><span>All work</span><span className="toolbar-count">{filtered.length}</span></div>
          <div className="list-filters">
            <label className="list-search"><Search size={16} /><input aria-label="Search work items" placeholder="Search work items..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><kbd>⌘ K</kbd></label>
            <label className="filter-select-wrap"><Filter size={15} /><select aria-label="Filter by status" value={statusFilter} onChange={(event) => changeFilter("status", event.target.value)}><option value="">All statuses</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="AWAITING_APPROVAL">Awaiting approval</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label>
            <label className="filter-select-wrap"><SlidersHorizontal size={15} /><select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => changeFilter("priority", event.target.value)}><option value="">All priorities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label>
            <label className="filter-select-wrap"><select aria-label="Filter by assignee" value={assigneeFilter} onChange={(event) => changeFilter("assigneeId", event.target.value)}><option value="">All assignees</option>{Array.from(new Map(items.filter((item) => item.assignee).map((item) => [item.assignee!.id, item.assignee!])).values()).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
          </div>
        </div>
        {loading ? <Loading label="Loading work items" /> : pageItems.length === 0 ? (
          <div className="empty-state list-empty"><div className="empty-icon"><CirclePlus size={21} /></div><strong>No work items found</strong><p>Try changing your search or filters.</p><button className="text-link-button" onClick={() => { setSearch(""); setSearchParams({}); }}>Clear filters</button></div>
        ) : (
          <>
            <div className="work-table-wrap"><table className="work-table">
              <thead><tr><th>WORK ITEM</th><th>STATUS</th><th>PRIORITY</th><th>ASSIGNEE</th><th>TEAM</th><th>UPDATED</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>{pageItems.map((item) => <tr key={item.id}>
                <td><Link className="work-item-cell" to={`/work-items/${item.id}`}><span className={`row-type-icon type-${item.type.toLowerCase()}`}><ArrowDownUp size={14} /></span><span className="work-title-block"><strong>{item.title}</strong><small>OPS-{String(item.id).padStart(4, "0")} <span>·</span> {item.type.replaceAll("_", " ")}</small></span></Link></td>
                <td><StatusBadge status={item.status as WorkStatus} /></td>
                <td><PriorityBadge priority={item.priority as Priority} /></td>
                <td>{item.assignee ? <div className="assignee-cell"><span className="assignee-avatar">{item.assignee.name.slice(0, 1).toUpperCase()}</span><span>{item.assignee.name}</span></div> : <span className="unassigned-pill">Unassigned</span>}</td>
                <td><span className="team-cell"><span className="team-cell-dot" />{item.team?.name ?? "Team"}</span></td>
                <td><span className="updated-cell">{new Date(item.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span></td>
                <td><Link to={`/work-items/${item.id}`} className="row-open" aria-label={`Open ${item.title}`}><ArrowRight size={16} /></Link></td>
              </tr>)}</tbody>
            </table></div>
            <div className="table-pagination">
              <span>Showing <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> items</span>
              <div className="pagination-controls"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><span>Page <strong>{page}</strong> of {pageCount}</span><button aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div>
            </div>
          </>
        )}
      </section>
      {createOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
        <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
          <div className="modal-header"><div><div className="eyebrow"><span className="eyebrow-line" /> NEW ITEM</div><h2 id="create-title">Create work item</h2><p>Give your team a clear next step.</p></div><button className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Close create dialog">×</button></div>
          {createError && <Notice message={createError} />}
          <form className="create-form" onSubmit={submitNewWorkItem}>
            <label>Title<input autoFocus required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="What needs to get done?" /></label>
            <label>Description<textarea required rows={4} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Add context and details for your team..." /></label>
            <div className="create-form-row">
              <label>Team<select required value={newTeamId} onChange={(event) => setNewTeamId(event.target.value)}>{writableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
              <label>Type<select value={newType} onChange={(event) => setNewType(event.target.value)}><option value="TASK">Task</option><option value="INCIDENT">Incident</option><option value="CUSTOMER_ISSUE">Customer issue</option><option value="PAYMENT">Payment</option><option value="COMPLIANCE">Compliance</option></select></label>
              <label>Priority<select value={newPriority} onChange={(event) => setNewPriority(event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="primary-button" disabled={createLoading || !newTeamId}>{createLoading ? "Creating…" : "Create work item"} <ArrowRight size={15} /></button></div>
          </form>
        </section>
      </div>}
    </div>
  );
};
