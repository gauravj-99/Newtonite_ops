import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Flame,
  Layers3,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { getAllTeamWorkItems } from "../api/workItems";
import { useAuth } from "../auth/AuthContext";
import { Loading } from "../components/Loading";
import { Notice } from "../components/Notice";
import { PriorityBadge } from "../components/PriorityBadge";
import { StatusBadge } from "../components/StatusBadge";
import type { WorkItem } from "../types";

const displayDate = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });

export const DashboardPage = () => {
  const { user, teams, activeTeamId } = useAuth();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const name = user?.email.split("@")[0]?.split(/[._-]/)[0] ?? "there";

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const scopedTeams = activeTeamId === null ? teams : teams.filter((team) => team.id === activeTeamId);
        const allItems = await getAllTeamWorkItems(scopedTeams.map((team) => team.id));
        if (active) setItems(allItems);
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [teams, activeTeamId]);

  const assigned = useMemo(() => items.filter((item) => item.assigneeId === user?.userId && item.status !== "CLOSED" && item.status !== "RESOLVED"), [items, user]);
  const critical = useMemo(() => items.filter((item) => item.priority === "CRITICAL" && item.assigneeId === null && item.status !== "CLOSED" && item.status !== "RESOLVED"), [items]);
  const approval = useMemo(() => {
    const leadTeamIds = new Set(teams.filter((team) => team.role === "LEAD" && (activeTeamId === null || team.id === activeTeamId)).map((team) => team.id));
    return items.filter((item) => item.status === "AWAITING_APPROVAL" && leadTeamIds.has(item.teamId));
  }, [items, teams, activeTeamId]);
  const visible = [...assigned, ...critical, ...approval].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 5);

  return (
    <div className="page-content">
      <div className="page-title-row dashboard-title-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {displayDate.format(new Date()).toUpperCase()}</div>
          <h1>Good morning, {name}<span className="title-wave">.</span></h1>
          <p className="page-subtitle">Here's what's happening across your workspace today.</p>
        </div>
        <Link to="/work-items?create=1" className="primary-button"><Plus size={17} /> New work item</Link>
      </div>
      {error && <Notice message={error} onDismiss={() => setError("")} />}
      {loading ? <Loading label="Loading your operations" /> : <>
        <section className="metrics-grid">
          <Link to="/work-items?view=assigned" className="metric-card metric-card-indigo">
            <div className="metric-top"><div className="metric-icon metric-icon-indigo"><Target size={18} /></div><div className="metric-trend"><ArrowRight size={14} /> Active</div></div>
            <div className="metric-value">{assigned.length.toString().padStart(2, "0")}</div><div className="metric-label">Assigned to me</div>
            <div className="metric-foot"><span>Your active workload</span><ArrowRight size={15} /></div>
          </Link>
          <Link to="/work-items?priority=CRITICAL&unassigned=true" className="metric-card metric-card-rose">
            <div className="metric-top"><div className="metric-icon metric-icon-rose"><Flame size={18} /></div><div className="metric-trend metric-trend-warning"><span className="metric-live-dot" /> Needs attention</div></div>
            <div className="metric-value">{critical.length.toString().padStart(2, "0")}</div><div className="metric-label">Unassigned critical</div>
            <div className="metric-foot"><span>High urgency, no owner</span><ArrowRight size={15} /></div>
          </Link>
          <Link to="/work-items?status=AWAITING_APPROVAL&view=approval" className="metric-card metric-card-amber">
            <div className="metric-top"><div className="metric-icon metric-icon-amber"><ShieldCheck size={18} /></div><div className="metric-trend"><Clock3 size={13} /> In queue</div></div>
            <div className="metric-value">{approval.length.toString().padStart(2, "0")}</div><div className="metric-label">Awaiting my approval</div>
            <div className="metric-foot"><span>Items need your review</span><ArrowRight size={15} /></div>
          </Link>
        </section>

        <section className="dashboard-grid">
          <div className="panel work-overview-panel">
            <div className="panel-heading">
              <div><div className="panel-title">Priority overview</div><div className="panel-subtitle">Your team's operational pulse</div></div>
              <Link to="/work-items" className="text-link">View all <ArrowRight size={14} /></Link>
            </div>
            <div className="overview-stats">
              <div className="overview-stat"><div className="overview-stat-label"><span className="legend-dot legend-open" />Open</div><div className="overview-stat-value">{items.filter((item) => item.status === "OPEN").length}</div><div className="overview-stat-note">Ready to pick up</div></div>
              <div className="overview-stat"><div className="overview-stat-label"><span className="legend-dot legend-progress" />In progress</div><div className="overview-stat-value">{items.filter((item) => item.status === "IN_PROGRESS").length}</div><div className="overview-stat-note">Being worked on</div></div>
              <div className="overview-stat"><div className="overview-stat-label"><span className="legend-dot legend-approval" />In review</div><div className="overview-stat-value">{items.filter((item) => item.status === "AWAITING_APPROVAL").length}</div><div className="overview-stat-note">Awaiting sign-off</div></div>
            </div>
            <div className="overview-bar" aria-label="Work item status distribution">
              <span className="bar-open" style={{ width: `${items.length ? Math.max(4, items.filter((i) => i.status === "OPEN").length / items.length * 100) : 0}%` }} />
              <span className="bar-progress" style={{ width: `${items.length ? Math.max(4, items.filter((i) => i.status === "IN_PROGRESS").length / items.length * 100) : 0}%` }} />
              <span className="bar-approval" style={{ width: `${items.length ? Math.max(4, items.filter((i) => i.status === "AWAITING_APPROVAL").length / items.length * 100) : 0}%` }} />
              <span className="bar-resolved" style={{ width: `${items.length ? Math.max(4, items.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length / items.length * 100) : 0}%` }} />
            </div>
            <div className="overview-foot"><span><span className="live-dot" /> Live team data</span><span>{items.length} total work items</span></div>
          </div>
          <div className="focus-card">
            <div className="focus-orb focus-orb-one" /><div className="focus-orb focus-orb-two" />
            <div className="focus-topline"><span className="focus-tag"><Sparkles size={13} /> TODAY'S FOCUS</span><span className="focus-date">{new Date().toLocaleDateString("en", { month: "short", day: "numeric" })}</span></div>
            <div className="focus-content"><div className="focus-icon"><Layers3 size={20} /></div><h3>Keep your team<br />moving forward.</h3><p>Review what's on your plate and make progress on the work that matters most.</p><Link to="/work-items" className="focus-link">Open my work <ArrowRight size={15} /></Link></div>
            <div className="focus-bottom"><Users size={15} /><span>Across {activeTeamId === null ? teams.length : 1} {(activeTeamId === null ? teams.length : 1) === 1 ? "team" : "teams"}</span><span className="focus-bottom-spacer" /><span className="focus-icon-check"><Check size={13} /></span></div>
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading"><div><div className="panel-title">Needs your attention</div><div className="panel-subtitle">A focused view of the work requiring action</div></div><Link to="/work-items" className="text-link">See all work <ChevronRight size={15} /></Link></div>
          {visible.length === 0 ? <div className="empty-state compact-empty"><div className="empty-icon"><CircleDot size={20} /></div><div><strong>All caught up</strong><p>Nothing needs your attention right now.</p></div></div> : (
            <div className="attention-list">{visible.map((item) => (
              <Link to={`/work-items/${item.id}`} className="attention-row" key={item.id}>
                <div className={`attention-type-icon type-${item.type.toLowerCase()}`}><Layers3 size={16} /></div>
                <div className="attention-main"><div className="attention-title">{item.title}</div><div className="attention-meta"><span>{item.team?.name}</span><span className="meta-divider">·</span><span>{item.type.replaceAll("_", " ")}</span></div></div>
                <PriorityBadge priority={item.priority} /><StatusBadge status={item.status} /><div className="attention-arrow"><ArrowRight size={16} /></div>
              </Link>
            ))}</div>
          )}
        </section>
      </>}
    </div>
  );
};
