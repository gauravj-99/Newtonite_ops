import {
  Activity,
  ChevronDown,
  CircleHelp,
  Command,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/work-items", label: "Work items", icon: ListTodo },
];

export const AppShell = () => {
  const { user, teams, activeTeamId, setActiveTeamId, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const navigate = useNavigate();
  const team = teams.find((membership) => membership.id === activeTeamId);

  const logout = () => {
    signOut();
    navigate("/login");
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div>
          <span>newtonite<span className="brand-ops">ops</span></span>
          <button className="sidebar-close icon-button md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <button className="workspace-switcher" onClick={() => setTeamMenuOpen(!teamMenuOpen)}>
          <div className="workspace-avatar">{team?.name?.slice(0, 1).toUpperCase() ?? "A"}</div>
          <div className="min-w-0 flex-1 text-left">
            <div className="workspace-label">WORKSPACE</div>
            <div className="workspace-name truncate">{team?.name ?? "All teams"}</div>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition ${teamMenuOpen ? "rotate-180" : ""}`} />
        </button>
        {teamMenuOpen && <div className="team-popover">
          <button className={`team-option team-option-button ${activeTeamId === null ? "team-option-active" : ""}`} onClick={() => { setActiveTeamId(null); setTeamMenuOpen(false); }}>
            <span className="workspace-avatar small">A</span><span className="min-w-0 flex-1 truncate">All teams</span>
          </button>
          {teams.map((membership) => <button className={`team-option team-option-button ${activeTeamId === membership.id ? "team-option-active" : ""}`} key={membership.id} onClick={() => { setActiveTeamId(membership.id); setTeamMenuOpen(false); }}>
            <span className="workspace-avatar small">{membership.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1 truncate">{membership.name}</span>
            <span className="text-xs text-slate-400">{membership.role.toLowerCase()}</span>
          </button>)}
        </div>}
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="sidebar-nav">{navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`} onClick={() => setMenuOpen(false)}>
            <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === "Work items" && <span className="nav-shortcut">⌘ 2</span>}
          </NavLink>
        ))}</nav>
        <div className="nav-section-label nav-section-spaced">MANAGE</div>
        <nav className="sidebar-nav">
          <button className="nav-link nav-link-muted" disabled><ShieldCheck size={18} /><span>Access & roles</span></button>
          <button className="nav-link nav-link-muted" disabled><Settings2 size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-link nav-link-muted" href="mailto:support@newtonite.com"><CircleHelp size={18} /><span>Help center</span></a>
          <div className="sidebar-user">
            <div className="user-avatar">{user?.email.slice(0, 1).toUpperCase() ?? "U"}</div>
            <div className="min-w-0 flex-1"><div className="user-name truncate">{user?.email.split("@")[0] ?? "Operator"}</div><div className="user-role">{team?.role ?? "TEAM MEMBER"}</div></div>
            <button className="icon-button logout-button" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <div className="main-column">
        <header className="topbar">
          <button className="icon-button md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Operations</strong></div>
          <div className="topbar-actions">
            <button className="search-trigger" onClick={() => navigate("/work-items")}><Search size={16} /><span>Search work items...</span><kbd><Command size={11} /> K</kbd></button>
            <div className="topbar-avatar">{user?.email.slice(0, 1).toUpperCase() ?? "U"}</div>
          </div>
        </header>
        <main className="page-container"><Outlet /></main>
        <footer className="app-footer"><span>Newtonite Operations</span><span>Internal operations platform <span className="footer-dot">·</span> v1.0</span></footer>
      </div>
    </div>
  );
};
