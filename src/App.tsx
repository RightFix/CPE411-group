import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Badge, type BadgeTone } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  PrinterIcon,
  SearchIcon,
  UsersIcon,
} from "./components/ui/Icons";
import { Input } from "./components/ui/Input";
import { Navbar } from "./components/ui/Navbar";
import { Select, type SelectOption } from "./components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/Table";
import { Toast, type ToastData } from "./components/ui/Toast";
import { groups, type Student } from "./data/groups";
import { topics } from "./data/topics";

type RoleId = "presenter" | "research" | "slides";

const roles: { id: RoleId; label: string; tone: BadgeTone; description: string }[] = [
  { id: "presenter", label: "Presenter", tone: "green", description: "Delivers the group presentation" },
  { id: "research", label: "Researcher", tone: "blue", description: "Gathers technical content & references" },
  { id: "slides", label: "Slide Creator", tone: "violet", description: "Designs and structures the deck" },
];

type Row = Student & { subtopicIndex: number | null; roleId: RoleId | null };
type Session = { regNo: string; studentSn: number; groupId: number; name: string };
type SaveState = { kind: "idle" | "saving" | "saved" | "error"; text: string };
type GroupTab = "roster" | "subtopics";
type RosterFilter = "all" | "selected" | "pending";

const SESSION_KEY = "cpe411_regno";
const normReg = (v: string) => v.trim().toLowerCase();

function findSessionByRegNo(regNo: string): Session | null {
  const n = normReg(regNo);
  for (const g of groups) {
    const s = g.students.find((st) => normReg(st.regNo) === n);
    if (s) return { regNo: s.regNo, studentSn: s.sn, groupId: g.id, name: s.name };
  }
  return null;
}

function readSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return findSessionByRegNo(stored);
  } catch {
    return null;
  }
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || "Request failed" };
  }
  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Footer() {
  return (
    <footer className="footer no-print">
      <a href="https://github.com/RightFix/CPE411-group" target="_blank" rel="noopener noreferrer">
        Powered by RightFix
      </a>
    </footer>
  );
}

function getGroupIdFromPath() {
  const m = window.location.pathname.match(/^\/group(\d+)\/?$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return groups.some((g) => g.id === id) ? id : null;
}

function getRoleMeta(roleId: RoleId | null) {
  return roleId ? roles.find((r) => r.id === roleId) ?? null : null;
}

/* ==========================================================================
   Login Page
   ========================================================================== */

function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [regNo, setRegNo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const session = findSessionByRegNo(regNo);
    if (!session) {
      setError("Registration number not found. Check the format and try again.");
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, session.regNo);
    } catch {
      // Ignore storage failures in private browsing
    }
    onLogin(session);
  };

  return (
    <div className="page page--narrow">
      <main className="login-shell">
        <header className="page-header">
          <div className="login-brand">
            <span className="ui-navbar-dot" aria-hidden="true" />
            <span>CPE 411 · Microprocessor &amp; Embedded Systems</span>
          </div>
          <h1 className="login-title">Sign in to your group</h1>
          <p className="page-subtitle">
            Enter your registration number to view your assigned group and select your subtopic and role.
          </p>
        </header>

        <Card padding="lg">
          <form onSubmit={submit} className="login-form">
            <Input
              label="Registration Number"
              value={regNo}
              onChange={(e) => {
                setRegNo(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 22/EG/CO/1631"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              enterKeyHint="go"
              error={error ?? undefined}
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth>
              Continue to my group
            </Button>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

/* ==========================================================================
   All Groups Directory
   ========================================================================== */

function GroupsList({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <div className="page">
      <Navbar
        brandLabel="CPE 411"
        studentName={session.name}
        studentRegNo={session.regNo}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate(`/group${session.groupId}`)}>
            My group
          </Button>
        }
        onLogout={onLogout}
      />

      <main className="page-main">
        <header className="page-header">
          <h1 className="page-title">Course Groupings</h1>
          <p className="page-subtitle">
            Browse all {groups.length} project groups. You can edit your own subtopic and role inside Group{" "}
            {session.groupId}.
          </p>
        </header>

        <div className="groups-grid">
          {groups.map((g) => {
            const topic = topics.find((t) => t.id === g.id)!;
            const mine = g.id === session.groupId;
            return (
              <button
                key={g.id}
                type="button"
                className={`folder-card ${mine ? "is-mine" : ""}`}
                onClick={() => navigate(`/group${g.id}`)}
              >
                <span className="folder-tab" aria-hidden="true">
                  <span className="folder-tab-label">{g.name}</span>
                  {mine && <span className="folder-tab-dot" />}
                </span>
                <span className="folder-back" aria-hidden="true" />
                <span className="folder-sheet folder-sheet--back" aria-hidden="true" />
                <span className="folder-sheet folder-sheet--front" aria-hidden="true" />
                <span className="folder-body">
                  <span className="folder-body-head">
                    <span className="folder-num">{g.name}</span>
                    {mine && <Badge tone="primary">My group</Badge>}
                  </span>
                  <span className="folder-topic">{topic.title}</span>
                  <span className="folder-meta tabular">
                    {g.students.length} students · {topic.subtopics.length} subtopics
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ==========================================================================
   Group Detail Page
   ========================================================================== */

function GroupPage({
  groupId,
  session,
  onLogout,
}: {
  groupId: number;
  session: Session;
  onLogout: () => void;
}) {
  const group = groups.find((g) => g.id === groupId)!;
  const topic = topics.find((t) => t.id === groupId)!;

  const [rows, setRows] = useState<Row[]>(() =>
    group.students.map((s) => ({ ...s, subtopicIndex: null, roleId: null }))
  );
  const [draftSubtopic, setDraftSubtopic] = useState<number | null>(null);
  const [draftRole, setDraftRole] = useState<RoleId | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "saving", text: "Loading selections…" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>("roster");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (tone: ToastData["tone"], title: string, description?: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), tone, title, description });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, tone === "error" ? 5000 : 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isMyGroup = session.groupId === groupId;
  const canEdit = (sn: number) => isMyGroup && sn === session.studentSn;

  const subtopicOptions: SelectOption<number>[] = useMemo(
    () =>
      topic.subtopics.map((text, idx) => ({
        value: idx,
        prefix: String(idx + 1),
        label: `Subtopic ${idx + 1}`,
        description: text,
      })),
    [topic]
  );

  const roleOptions: SelectOption<RoleId>[] = useMemo(
    () =>
      roles.map((r) => ({
        value: r.id,
        label: r.label,
        description: r.description,
      })),
    []
  );

  useEffect(() => {
    let alive = true;

    api<{ selections: { sn: number; subtopicIndex: number | null; roleId: RoleId | null }[] }>(
      `/api/groups/${groupId}/selections`
    )
      .then((data) => {
        if (!alive) return;
        const bySn = new Map(data.selections.map((s) => [s.sn, s]));
        const loadedRows = group.students.map((s) => ({
          ...s,
          subtopicIndex: bySn.get(s.sn)?.subtopicIndex ?? null,
          roleId: (bySn.get(s.sn)?.roleId as RoleId | null) ?? null,
        }));
        setRows(loadedRows);
        if (isMyGroup) {
          const mine = loadedRows.find((r) => r.sn === session.studentSn);
          setDraftSubtopic(mine?.subtopicIndex ?? null);
          setDraftRole(mine?.roleId ?? null);
        }
        setSaveState({ kind: "idle", text: "" });
      })
      .catch((e: Error) => {
        if (!alive) return;
        setLoadError(e.message || "Failed to load selections");
        setSaveState({ kind: "error", text: "Could not load selections" });
      });

    return () => {
      alive = false;
    };
  }, [groupId, group.students, isMyGroup, session.studentSn]);

  const myRow = useMemo(
    () => (isMyGroup ? rows.find((r) => r.sn === session.studentSn) ?? null : null),
    [isMyGroup, rows, session.studentSn]
  );

  const isDirty =
    myRow != null && (draftSubtopic !== myRow.subtopicIndex || draftRole !== myRow.roleId);
  const canSubmit =
    isMyGroup &&
    draftSubtopic != null &&
    draftRole != null &&
    isDirty &&
    saveState.kind !== "saving";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyGroup || draftSubtopic == null || draftRole == null) return;
    try {
      setSaveState({ kind: "saving", text: "Submitting…" });
      await api(`/api/groups/${groupId}/selections`, {
        method: "POST",
        body: JSON.stringify({
          studentSn: session.studentSn,
          subtopicIndex: draftSubtopic,
          roleId: draftRole,
          regNo: session.regNo,
        }),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.sn === session.studentSn
            ? { ...r, subtopicIndex: draftSubtopic, roleId: draftRole }
            : r
        )
      );
      setSaveState({ kind: "saved", text: "Saved" });
      const roleMeta = getRoleMeta(draftRole);
      showToast(
        "success",
        "Selection submitted",
        `Subtopic ${draftSubtopic + 1}${roleMeta ? ` · ${roleMeta.label}` : ""}`
      );
      window.setTimeout(() => {
        setSaveState((prev) => (prev.kind === "saved" ? { kind: "idle", text: "" } : prev));
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveState({ kind: "error", text: `Not saved: ${msg}` });
      showToast("error", "Could not submit selection", msg);
    }
  };

  const filledSubtopics = rows.filter((r) => r.subtopicIndex != null).length;
  const filledRoles = rows.filter((r) => r.roleId != null).length;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "selected" && r.subtopicIndex == null) return false;
      if (filter === "pending" && r.subtopicIndex != null) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.regNo.toLowerCase().includes(q);
    });
  }, [rows, search, filter]);

  const overview = useMemo(() => {
    return topic.subtopics.map((text, i) => {
      const members = rows.filter((r) => r.subtopicIndex === i);
      const byRole = roles.map((role) => ({
        ...role,
        members: members.filter((m) => m.roleId === role.id),
      }));
      const unassignedRole = members.filter((m) => !m.roleId);
      return { index: i, text, members, byRole, unassignedRole };
    });
  }, [rows, topic]);

  const subtopicPrintLabel = (idx: number | null) =>
    idx == null ? "Not selected" : `Subtopic ${idx + 1}: ${topic.subtopics[idx]}`;

  return (
    <div className="page">
      <Navbar
        brandLabel="CPE 411"
        onBrandClick={() => navigate("/")}
        studentName={session.name}
        studentRegNo={session.regNo}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeftIcon size={15} />
            <span>All groups</span>
          </Button>
        }
        onLogout={onLogout}
      />

      <main className="page-main">
        {/* Topic Header */}
        <header className="page-header no-print">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">{topic.title}</h1>
              <div className="meta-strip tabular">
                <span>
                  <strong>{group.name}</strong>
                </span>
                <span className="meta-dot" aria-hidden="true" />
                <span>{group.students.length} students</span>
                <span className="meta-dot" aria-hidden="true" />
                <span>{topic.subtopics.length} subtopics</span>
                <span className="meta-dot" aria-hidden="true" />
                <span>
                  {filledSubtopics}/{group.students.length} subtopics · {filledRoles}/{group.students.length} roles
                </span>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <PrinterIcon size={15} />
              <span>Print group list</span>
            </Button>
          </div>
        </header>

        {/* Pinned Action Form for Current Student (Mobile-First UX) */}
        {isMyGroup && myRow && (
          <Card padding="lg" className="my-selection-card no-print">
            <form onSubmit={handleSubmit}>
              <div className="my-selection-head">
                <div>
                  <h2 className="my-selection-title">Your Selection</h2>
                  <p className="my-selection-sub">
                    {myRow.name} · <span className="mono">{myRow.regNo}</span>
                  </p>
                </div>
                {saveState.kind !== "idle" ? (
                  <span
                    className={`status-pill ${
                      saveState.kind === "saved"
                        ? "is-saved"
                        : saveState.kind === "error"
                          ? "is-error"
                          : ""
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {saveState.text}
                  </span>
                ) : (
                  isDirty && <span className="status-pill">Unsaved changes</span>
                )}
              </div>

              <div className="my-selection-grid">
                <Select
                  label="Subtopic"
                  value={draftSubtopic}
                  options={subtopicOptions}
                  placeholder="Choose your subtopic"
                  onChange={(val) => setDraftSubtopic(val)}
                />
                <Select
                  label="Role"
                  value={draftRole}
                  options={roleOptions}
                  placeholder="Choose your role"
                  onChange={(val) => setDraftRole(val)}
                />
              </div>

              {draftSubtopic != null && (
                <div className="my-selection-preview">
                  <strong>Subtopic {draftSubtopic + 1}:</strong>{" "}
                  {topic.subtopics[draftSubtopic]}
                </div>
              )}

              <div className="my-selection-actions">
                <span className="my-selection-hint">
                  {draftSubtopic == null || draftRole == null
                    ? "Select both a subtopic and a role to submit."
                    : isDirty
                      ? "Click Submit selection to save your choice."
                      : "Your current selection is saved."}
                </span>
                <Button type="submit" variant="primary" disabled={!canSubmit}>
                  {saveState.kind === "saving" ? "Submitting…" : "Submit selection"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Read-Only Banner for Other Groups */}
        {!isMyGroup && (
          <Card variant="cloud" padding="sm" className="readonly-banner no-print">
            <p className="readonly-banner-text">
              Viewing <strong>{group.name}</strong> in read-only mode. You can only edit selections in Group{" "}
              {session.groupId}.
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/group${session.groupId}`)}>
              Go to Group {session.groupId}
            </Button>
          </Card>
        )}

        {loadError && (
          <Card variant="cloud" padding="sm" className="no-print">
            <p className="ui-field-error" role="alert">
              {loadError}
            </p>
          </Card>
        )}

        {/* View Switcher */}
        <div className="toolbar no-print">
          <div className="segmented" role="tablist" aria-label="Group views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "roster"}
              className={`segmented-btn ${activeTab === "roster" ? "is-active" : ""}`}
              onClick={() => setActiveTab("roster")}
            >
              <UsersIcon size={15} />
              <span>Student Roster</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "subtopics"}
              className={`segmented-btn ${activeTab === "subtopics" ? "is-active" : ""}`}
              onClick={() => setActiveTab("subtopics")}
            >
              <BookOpenIcon size={15} />
              <span>Subtopic Breakdown</span>
            </button>
          </div>
        </div>

        {/* Roster View (Screen) + Print Sheet */}
        <div className={activeTab === "roster" ? "" : "print-only"}>
          <Card padding="md" className="print-sheet">
            <div className="print-only print-header">
              <h2>
                CPE 411 · {group.name} — Group List
              </h2>
              <p>{topic.title}</p>
            </div>

            <div className="filter-row no-print">
              <div className="filter-search">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student name or reg no…"
                  leadingIcon={<SearchIcon size={15} />}
                  aria-label="Search students"
                />
              </div>
              <div className="filter-pills" role="group" aria-label="Filter by selection status">
                <button
                  type="button"
                  className={`filter-pill ${filter === "all" ? "is-active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All ({rows.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filter === "selected" ? "is-active" : ""}`}
                  onClick={() => setFilter("selected")}
                >
                  Selected ({filledSubtopics})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filter === "pending" ? "is-active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  Pending ({rows.length - filledSubtopics})
                </button>
              </div>
            </div>

            {/* Desktop Custom Table + Print Table */}
            <div className="desktop-roster">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 64 }}>S/N</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead style={{ width: 155 }}>Reg No</TableHead>
                    <TableHead style={{ width: 220 }}>Subtopic</TableHead>
                    <TableHead style={{ width: 180 }}>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => {
                    const mine = canEdit(r.sn);
                    const roleMeta = getRoleMeta(r.roleId);
                    return (
                      <TableRow
                        key={r.sn}
                        highlight={mine}
                        className="ui-table-tbody-row"
                      >
                        <TableCell className="mono">{r.sn}</TableCell>
                        <TableCell>
                          <div className="student-name-cell">
                            <span>{r.name}</span>
                            {mine && <Badge tone="primary" className="no-print">You</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="mono">{r.regNo}</TableCell>
                        <TableCell>
                          <span className="print-only">{subtopicPrintLabel(r.subtopicIndex)}</span>
                          <div className="no-print">
                            {r.subtopicIndex != null ? (
                              <span>Subtopic {r.subtopicIndex + 1}</span>
                            ) : (
                              <span className="muted-text">Not selected</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="print-only">{roleMeta?.label ?? "Not selected"}</span>
                          <div className="no-print">
                            {roleMeta ? (
                              <Badge tone={roleMeta.tone}>{roleMeta.label}</Badge>
                            ) : (
                              <span className="muted-text">Not selected</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredRows.length === 0 && (
                <div className="empty-state no-print">
                  No students match “{search}”.
                </div>
              )}
            </div>

            {/* Mobile Roster Cards (< 768px) */}
            <div className="mobile-roster no-print">
              {filteredRows.map((r) => {
                const mine = canEdit(r.sn);
                const roleMeta = getRoleMeta(r.roleId);
                return (
                  <div key={r.sn} className={`student-card ${mine ? "is-mine" : ""}`}>
                    <div className="student-card-top">
                      <div className="student-card-identity">
                        <div className="student-card-name">
                          <span>{r.name}</span>
                          {mine && <Badge tone="primary">You</Badge>}
                        </div>
                        <span className="student-card-reg mono">{r.regNo}</span>
                      </div>
                      <span className="student-card-sn mono">#{r.sn}</span>
                    </div>

                    <div className="student-card-meta">
                      <div className="student-card-row">
                        <span className="student-card-key">Subtopic</span>
                        <span className="student-card-val">
                          {r.subtopicIndex != null ? (
                            `Subtopic ${r.subtopicIndex + 1}`
                          ) : (
                            <span className="muted-text">Not selected</span>
                          )}
                        </span>
                      </div>
                      <div className="student-card-row">
                        <span className="student-card-key">Role</span>
                        <span className="student-card-val">
                          {roleMeta ? (
                            <Badge tone={roleMeta.tone}>{roleMeta.label}</Badge>
                          ) : (
                            <span className="muted-text">Not selected</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredRows.length === 0 && (
                <div className="empty-state">No students match “{search}”.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Subtopic Breakdown View */}
        {activeTab === "subtopics" && (
          <section className="subtopics-grid no-print" aria-label="Subtopic Breakdown">
            {overview.map((o) => (
              <Card key={o.index} padding="md" className="subtopic-card">
                <div className="subtopic-card-head">
                  <h2 className="subtopic-card-title">
                    <span className="subtopic-num">{o.index + 1}</span>
                    <span>Subtopic {o.index + 1}</span>
                  </h2>
                  <Badge tone="neutral" className="tabular">
                    {o.members.length} selected
                  </Badge>
                </div>

                <p className="subtopic-desc">{o.text}</p>

                <div className="role-groups">
                  {o.byRole.map((role) => (
                    <div key={role.id}>
                      <div className="role-group-head">
                        <Badge tone={role.tone}>{role.label}</Badge>
                        <span className="mono" style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
                          {role.members.length}
                        </span>
                      </div>
                      {role.members.length > 0 ? (
                        <ul className="role-member-list">
                          {role.members.map((m) => (
                            <li key={m.sn} className="role-member-item">
                              <span>{m.name}</span>
                              <span className="role-member-reg mono">{m.regNo}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted-text" style={{ fontSize: 13 }}>
                          None yet
                        </p>
                      )}
                    </div>
                  ))}

                  {o.unassignedRole.length > 0 && (
                    <div>
                      <div className="role-group-head">
                        <Badge tone="neutral">No role yet</Badge>
                        <span className="mono" style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
                          {o.unassignedRole.length}
                        </span>
                      </div>
                      <ul className="role-member-list">
                        {o.unassignedRole.map((m) => (
                          <li key={m.sn} className="role-member-item">
                            <span>{m.name}</span>
                            <span className="role-member-reg mono">{m.regNo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </section>
        )}
      </main>

      <Footer />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* ==========================================================================
   Root Router
   ========================================================================== */

export default function App() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onLogin = (s: Session) => {
    setSession(s);
    navigate(`/group${s.groupId}`);
  };

  const onLogout = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
    setSession(null);
    navigate("/");
  };

  useEffect(() => {
    if (!session && window.location.pathname !== "/") {
      navigate("/");
    }
  }, [session, path]);

  if (!session) return <LoginPage onLogin={onLogin} />;

  const groupId = getGroupIdFromPath();
  if (groupId) return <GroupPage key={groupId} groupId={groupId} session={session} onLogout={onLogout} />;
  return <GroupsList session={session} onLogout={onLogout} />;
}
