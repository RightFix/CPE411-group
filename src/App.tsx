import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { groups, type Student } from "./data/groups";
import { topics } from "./data/topics";

type RoleId = "presenter" | "research" | "slides";
const roles: { id: RoleId; label: string }[] = [
  { id: "presenter", label: "Presenter" },
  { id: "research", label: "Researcher" },
  { id: "slides", label: "Slide Creator" },
];

type Row = Student & { subtopicIndex: number | null; roleId: RoleId | null };

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || "Request failed" }; }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

function getGroupIdFromPath() {
  const m = window.location.pathname.match(/^\/group(\d+)\/?$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return groups.some(g => g.id === id) ? id : null;
}

function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Home() {
  return (
    <div className="page">
      <header className="hero">
        <p className="kicker">CPE 411</p>
        <h1>Microprocessor and Embedded Systems — Groupings</h1>
        <p className="sub">Select your group to continue and choose your subtopic and role.</p>
      </header>

      <section className="card">
        <h2>Select your group</h2>
        <div className="group-select-grid">
          {groups.map(g => {
            const topic = topics.find(t => t.id === g.id)!;
            return (
              <button key={g.id} type="button" className="group-card-btn" onClick={() => navigate(`/group${g.id}`)}>
                <span className="group-num">Group {g.id}</span>
                <span className="group-meta">{g.students.length} students · {topic.subtopics.length} subtopics</span>
                <span className="group-topic">{topic.title}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GroupPage({ groupId }: { groupId: number }) {
  const group = groups.find(g => g.id === groupId)!;
  const topic = topics.find(t => t.id === groupId)!;
  const [rows, setRows] = useState<Row[]>(() => group.students.map(s => ({ ...s, subtopicIndex: null, roleId: null })));
  const [openSub, setOpenSub] = useState<number | null>(null);
  const [openRole, setOpenRole] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setStatus("Loading selections…");
    api<{ selections: { sn: number; subtopicIndex: number | null; roleId: RoleId | null }[] }>(`/api/groups/${groupId}/selections`)
      .then(data => {
        if (!alive) return;
        const bySn = new Map(data.selections.map(s => [s.sn, s]));
        setRows(group.students.map(s => ({
          ...s,
          subtopicIndex: bySn.get(s.sn)?.subtopicIndex ?? null,
          roleId: (bySn.get(s.sn)?.roleId as RoleId | null) ?? null,
        })));
        setStatus(null);
      })
      .catch(e => { if (alive) setStatus(e.message || "Failed to load selections"); });
    setOpenSub(null); setOpenRole(null);
    return () => { alive = false; };
  }, [groupId]);

  const persist = async (sn: number, subtopicIndex: number | null, roleId: RoleId | null) => {
    try {
      setStatus("Saving…");
      await api(`/api/groups/${groupId}/selections`, { method: "POST", body: JSON.stringify({ studentSn: sn, subtopicIndex, roleId }) });
      setStatus("Saved.");
      setTimeout(() => setStatus(s => (s === "Saved." ? null : s)), 1500);
    } catch (e: any) {
      setStatus(`Not saved: ${e.message || "Failed to save"}. Check that the server/API is running and DB_URI is set.`);
      console.error(e);
    }
  };

  const setSub = (sn: number, idx: number) => {
    const prev = rows;
    const next = rows.map(r => r.sn === sn ? { ...r, subtopicIndex: idx } : r);
    setRows(next);
    setOpenSub(null);
    const row = next.find(r => r.sn === sn)!;
    persist(sn, row.subtopicIndex, row.roleId);
    void prev;
  };
  const setRole = (sn: number, roleId: RoleId) => {
    const prev = rows;
    const next = rows.map(r => r.sn === sn ? { ...r, roleId } : r);
    setRows(next);
    setOpenRole(null);
    const row = next.find(r => r.sn === sn)!;
    persist(sn, row.subtopicIndex, row.roleId);
    void prev;
  };

  const overview = useMemo(() => {
    return topic.subtopics.map((st, i) => {
      const members = rows.filter(r => r.subtopicIndex === i);
      const byRole = roles.map(role => ({
        ...role,
        members: members.filter(m => m.roleId === role.id),
      }));
      const unassignedRole = members.filter(m => !m.roleId);
      return { index: i, text: st, members, byRole, unassignedRole };
    });
  }, [rows, topic]);

  const filled = rows.filter(r => r.subtopicIndex != null).length;

  return (
    <div className="page">
      <header className="hero">
        <button type="button" className="secondary back" onClick={() => navigate("/")}>← All groups</button>
        <p className="kicker">CPE 411 · {group.name}</p>
        <h1>{topic.title}</h1>
        <p className="sub">{group.students.length} students · {topic.subtopics.length} subtopics · {filled} with subtopic selected</p>
      </header>

      <section className="card">
        <div className="section-head">
          <h2>{group.name} — Student Selections</h2>
        </div>
        {status && <p className="notice">{status}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>S/N</th><th>Student Name</th><th>Reg No</th><th>Subtopic</th><th>Role</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sn}>
                  <td data-label="S/N">{r.sn}</td>
                  <td data-label="Student Name" className="name">{r.name}</td>
                  <td data-label="Reg No" className="mono">{r.regNo}</td>
                  <td data-label="Subtopic" className="subtopic-cell">
                    <button type="button" className="cell-btn" onClick={() => { setOpenSub(openSub === r.sn ? null : r.sn); setOpenRole(null); }}>
                      {r.subtopicIndex == null ? <span className="muted">Not selected</span> : <span>Subtopic {r.subtopicIndex + 1}</span>}
                    </button>
                    {openSub === r.sn && (
                      <div className="subtopic-menu">
                        {topic.subtopics.map((s, i) => (
                          <button key={i} type="button" className={`subtopic-option ${r.subtopicIndex === i ? "active" : ""}`} onClick={() => setSub(r.sn, i)}>
                            <strong>{i + 1}.</strong> {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td data-label="Role" className="subtopic-cell">
                    <button type="button" className="cell-btn" onClick={() => { setOpenRole(openRole === r.sn ? null : r.sn); setOpenSub(null); }}>
                      {r.roleId ? <span className={`badge ${r.roleId}`}>{roles.find(x => x.id === r.roleId)?.label}</span> : <span className="muted">Not selected</span>}
                    </button>
                    {openRole === r.sn && (
                      <div className="subtopic-menu">
                        {roles.map(role => (
                          <button key={role.id} type="button" className={`subtopic-option ${r.roleId === role.id ? "active" : ""}`} onClick={() => setRole(r.sn, role.id)}>
                            {role.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overview">
        <div className="card summary-card">
          <h2>Group Overview</h2>
          <p className="summary-line">
            <strong>{group.students.length}</strong> students · <strong>{topic.subtopics.length}</strong> subtopics · <strong>{filled}</strong> with subtopic · <strong>{rows.filter(r=>r.roleId).length}</strong> with role
          </p>
        </div>
        <div className="groups subtopic-assignments">
          {overview.map(o => (
            <div key={o.index} className="card group-card inner">
              <div className="group-head">
                <h3><span className="letter">{o.index + 1}</span> Subtopic {o.index + 1}</h3>
                <span className="count">{o.members.length} selected</span>
              </div>
              <p className="fulltext">{o.text}</p>
              <div className="role-blocks">
                {o.byRole.map(role => (
                  <div key={role.id} className="role-block">
                    <div className="role-title"><span className={`badge ${role.id}`}>{role.label}</span> <span>{role.members.length}</span></div>
                    <ul>
                      {role.members.map(m => <li key={m.sn} className="mono">{m.name} <small>({m.regNo})</small></li>)}
                      {role.members.length === 0 && <li className="open-slot">None</li>}
                    </ul>
                  </div>
                ))}
                {o.unassignedRole.length > 0 && (
                  <div className="role-block">
                    <div className="role-title"><span className="muted">No role yet</span> <span>{o.unassignedRole.length}</span></div>
                    <ul>{o.unassignedRole.map(m => <li key={m.sn} className="mono">{m.name}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [groupId, setGroupId] = useState<number | null>(() => getGroupIdFromPath());

  useEffect(() => {
    const onPop = () => setGroupId(getGroupIdFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return groupId ? <GroupPage groupId={groupId} /> : <Home />;
}
