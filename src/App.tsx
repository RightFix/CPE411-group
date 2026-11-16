import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Badge, type BadgeTone } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import {
  AlertCircleIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChipLogoIcon,
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

function ProgressRing({ percent }: { percent: number }) {
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="stat-ring" aria-label={`${clamped}%`}>
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="var(--color-hairline-strong)"
          strokeWidth="4.5"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 300ms var(--ease-out)" }}
        />
      </svg>
      <span className="stat-ring-text mono">{clamped}%</span>
    </div>
  );
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
            <ChipLogoIcon size={24} />
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
                <span className="folder-pocket" aria-hidden="true">
                  <span className="folder-doc-back" />
                  <span className="folder-doc">
                    <span className="folder-doc-kicker">Course content</span>
                    {topic.subtopics.slice(0, 3).map((sub, idx) => (
                      <span key={idx} className="folder-doc-line">
                        <span className="folder-doc-idx mono">{idx + 1}</span>
                        <span className="folder-doc-text">{sub}</span>
                      </span>
                    ))}
                  </span>
                </span>

                <span className="folder-flap">
                  <svg
                    className="folder-flap-curve"
                    viewBox="0 0 320 28"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M0,16 C0,6 8,0 20,0 L118,0 C138,0 146,16 170,16 L304,16 C314,16 320,21 320,28 L0,28 Z" />
                  </svg>
                  <span className="folder-flap-content">
                    <span className="folder-body-head">
                      <span className="folder-num">{g.name}</span>
                      {mine && <Badge tone="primary">My group</Badge>}
                    </span>
                    <span className="folder-topic">{topic.title}</span>
                    <span className="folder-meta tabular">
                      {g.students.length} students · {topic.subtopics.length} subtopics
                    </span>
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
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle", text: "" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<GroupTab>("roster");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [formOpen, setFormOpen] = useState(true);
  const [isEditingSelection, setIsEditingSelection] = useState(false);
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
          const sub = mine?.subtopicIndex ?? null;
          const role = mine?.roleId ?? null;
          setDraftSubtopic(sub);
          setDraftRole(role);
          setIsEditingSelection(sub == null || role == null);
        }
        setLoadError(null);
        setIsLoading(false);
        setSaveState({ kind: "idle", text: "" });
      })
      .catch((e: Error) => {
        if (!alive) return;
        setLoadError(e.message || "Unable to reach the server. Check your connection and try again.");
        setIsLoading(false);
        setSaveState({ kind: "error", text: "Load failed" });
      });

    return () => {
      alive = false;
    };
  }, [groupId, group.students, isMyGroup, session.studentSn, reloadKey]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setSaveState({ kind: "idle", text: "" });
    setReloadKey((k) => k + 1);
  };

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
      setIsEditingSelection(false);
      const roleMeta = getRoleMeta(draftRole);
      showToast(
        "success",
        "Selection saved",
        `Subtopic ${draftSubtopic + 1}${roleMeta ? ` · ${roleMeta.label}` : ""}`
      );
      window.setTimeout(() => {
        setSaveState((prev) => (prev.kind === "saved" ? { kind: "idle", text: "" } : prev));
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveState({ kind: "error", text: "Save failed" });
      showToast("error", "Could not save selection", msg);
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

  const subtopicPct = group.students.length
    ? Math.round((filledSubtopics / group.students.length) * 100)
    : 0;
  const rolePct = group.students.length
    ? Math.round((filledRoles / group.students.length) * 100)
    : 0;
  const hasSavedSelection =
    myRow != null && myRow.subtopicIndex != null && myRow.roleId != null;
  const savedRoleMeta = getRoleMeta(myRow?.roleId ?? null);

  return (
    <div className="page page--has-bottom-bar">
      <Navbar
        brandLabel="CPE 411"
        onBrandClick={() => navigate("/")}
        studentName={session.name}
        studentRegNo={session.regNo}
        onLogout={onLogout}
      />

      <main className="page-main">
        {/* Topic Header (Option 3 layout + Option 2 Group pill + Border-in-border ring stat cards) */}
        <header className="page-header no-print">
          <nav className="group-breadcrumb" aria-label="Breadcrumb">
            <button type="button" className="group-breadcrumb-link" onClick={() => navigate("/")}>
              All groups
            </button>
            <span className="group-breadcrumb-sep" aria-hidden="true">/</span>
            <span className="group-pill">{group.name}</span>
            <span className="group-breadcrumb-meta tabular">· {topic.subtopics.length} subtopics</span>
          </nav>

          <div className="group-hero-grid">
            <div className="group-hero-main">
              <h1 className="page-title">{topic.title}</h1>
              <div className="group-hero-actions">
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <PrinterIcon size={15} />
                  <span>Print roster</span>
                </Button>
              </div>
            </div>

            <div className="stat-pair">
              <div className="stat-shell">
                <div className="stat-shell-head">
                  <span className="stat-shell-icon" aria-hidden="true">
                    <BookOpenIcon size={13} />
                  </span>
                  <span className="stat-shell-label">Subtopics picked</span>
                </div>
                <div className="stat-inner">
                  {isLoading ? (
                    <div className="stat-skeleton" aria-busy="true" aria-label="Loading subtopic stats">
                      <span className="skeleton-line skeleton-line--lg" />
                      <span className="skeleton-line skeleton-line--sm" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="stat-fraction mono">
                          <strong>{filledSubtopics}</strong>
                          <span> / {group.students.length}</span>
                        </div>
                        <div className="stat-caption">Students assigned</div>
                      </div>
                      <ProgressRing percent={subtopicPct} />
                    </>
                  )}
                </div>
              </div>

              <div className="stat-shell">
                <div className="stat-shell-head">
                  <span className="stat-shell-icon" aria-hidden="true">
                    <UsersIcon size={13} />
                  </span>
                  <span className="stat-shell-label">Roles filled</span>
                </div>
                <div className="stat-inner">
                  {isLoading ? (
                    <div className="stat-skeleton" aria-busy="true" aria-label="Loading role stats">
                      <span className="skeleton-line skeleton-line--lg" />
                      <span className="skeleton-line skeleton-line--sm" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="stat-fraction mono">
                          <strong>{filledRoles}</strong>
                          <span> / {group.students.length}</span>
                        </div>
                        <div className="stat-caption">Roles assigned</div>
                      </div>
                      <ProgressRing percent={rolePct} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Pinned Selection Summary or Collapsible Form for Current Student */}
        {isMyGroup && myRow && (
          <Card padding="lg" className="my-selection-card no-print">
            {isLoading ? (
              <div className="form-skeleton" aria-busy="true" aria-label="Loading your selection">
                <div className="my-selection-grid">
                  <span className="skeleton-field" />
                  <span className="skeleton-field" />
                </div>
              </div>
            ) : hasSavedSelection && !isEditingSelection ? (
              <div className="my-selection-summary">
                <div className="my-selection-toggle-top">
                  <div>
                    <h2 className="my-selection-title">Your Subtopic &amp; Role</h2>
                    <div className="my-selection-sub">
                      <span>{myRow.name}</span>
                      <span className="mono my-selection-reg">{myRow.regNo}</span>
                    </div>
                  </div>
                  <div className="my-selection-toggle-right">
                    {saveState.kind === "saved" && (
                      <span className="status-pill is-saved" role="status" aria-live="polite">
                        {saveState.text}
                      </span>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDraftSubtopic(myRow.subtopicIndex);
                        setDraftRole(myRow.roleId);
                        setIsEditingSelection(true);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="my-selection-summary-grid">
                  <div className="my-selection-summary-box">
                    <span className="stat-shell-label">Subtopic {myRow.subtopicIndex! + 1}</span>
                    <p className="my-selection-summary-text">
                      {topic.subtopics[myRow.subtopicIndex!]}
                    </p>
                  </div>
                  <div className="my-selection-summary-box">
                    <span className="stat-shell-label">Role</span>
                    <div style={{ marginTop: 6 }}>
                      {savedRoleMeta && (
                        <Badge tone={savedRoleMeta.tone}>{savedRoleMeta.label}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="my-selection-head" style={{ marginBottom: formOpen ? "var(--space-md)" : 0 }}>
                  <button
                    type="button"
                    className="my-selection-toggle"
                    aria-expanded={formOpen}
                    onClick={() => setFormOpen((prev) => !prev)}
                  >
                    <span className="my-selection-toggle-top">
                      <span className="my-selection-title">Your Subtopic &amp; Role</span>
                      <span className="my-selection-toggle-right">
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
                          isDirty && <span className="status-pill">Unsaved</span>
                        )}
                        <ChevronDownIcon
                          size={18}
                          className={`my-selection-chevron ${formOpen ? "is-open" : ""}`}
                        />
                      </span>
                    </span>
                    <span className="my-selection-sub">
                      <span>{myRow.name}</span>
                      <span className="mono my-selection-reg">{myRow.regNo}</span>
                    </span>
                  </button>
                </div>

                {formOpen && (
                  <form onSubmit={handleSubmit}>
                    <div className="my-selection-grid">
                      <Select
                        label="Subtopic"
                        value={draftSubtopic}
                        options={subtopicOptions}
                        placeholder="Select a subtopic"
                        disabled={!!loadError}
                        onChange={(val) => setDraftSubtopic(val)}
                      />
                      <Select
                        label="Role"
                        value={draftRole}
                        options={roleOptions}
                        placeholder="Select a role"
                        disabled={!!loadError}
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
                          ? "Pick both a subtopic and a role, then save."
                          : isDirty
                            ? "Ready to save your changes."
                            : `Saved to ${group.name}.`}
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {hasSavedSelection && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setDraftSubtopic(myRow.subtopicIndex);
                              setDraftRole(myRow.roleId);
                              setIsEditingSelection(false);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" variant="primary" disabled={!canSubmit}>
                          {saveState.kind === "saving" ? "Saving…" : "Save selection"}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            )}
          </Card>
        )}

        {/* Read-Only Banner for Other Groups */}
        {!isMyGroup && (
          <Card variant="cloud" padding="sm" className="readonly-banner no-print">
            <p className="readonly-banner-text">
              Read-only view for <strong>{group.name}</strong>. Switch to Group {session.groupId} to update your own selection.
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/group${session.groupId}`)}>
              Open Group {session.groupId}
            </Button>
          </Card>
        )}

        {loadError && (
          <Card padding="md" className="error-card no-print" role="alert">
            <div className="error-card-body">
              <span className="error-card-icon" aria-hidden="true">
                <AlertCircleIcon size={18} />
              </span>
              <div>
                <p className="error-card-title">Could not load group selections</p>
                <p className="error-card-desc">{loadError}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={retryLoad}>
              Retry
            </Button>
          </Card>
        )}

        {/* Desktop View Switcher */}
        <div className="toolbar no-print">
          <div className="segmented" role="tablist" aria-label="Group views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "roster"}
              className={`segmented-btn ${activeTab === "roster" ? "is-active" : ""}`}
              onClick={() => setActiveTab("roster")}
            >
              <UsersIcon size={15} variant={activeTab === "roster" ? "Bold" : "Linear"} />
              <span>Student Roster</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "subtopics"}
              className={`segmented-btn ${activeTab === "subtopics" ? "is-active" : ""}`}
              onClick={() => setActiveTab("subtopics")}
            >
              <BookOpenIcon size={15} variant={activeTab === "subtopics" ? "Bold" : "Linear"} />
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
                  placeholder="Search by name or reg no…"
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
                  Assigned ({filledSubtopics})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filter === "pending" ? "is-active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  Unassigned ({rows.length - filledSubtopics})
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
                            {isLoading ? (
                              <span className="skeleton-line skeleton-line--md" />
                            ) : r.subtopicIndex != null ? (
                              <span>Subtopic {r.subtopicIndex + 1}</span>
                            ) : (
                              <span className="muted-text">Unassigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="print-only">{roleMeta?.label ?? "Not selected"}</span>
                          <div className="no-print">
                            {isLoading ? (
                              <span className="skeleton-line skeleton-line--sm" />
                            ) : roleMeta ? (
                              <Badge tone={roleMeta.tone}>{roleMeta.label}</Badge>
                            ) : (
                              <span className="muted-text">Unassigned</span>
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
                  {search.trim()
                    ? `No students match “${search}”. Try a different name or registration number.`
                    : `No ${filter === "selected" ? "assigned" : "unassigned"} students in this group yet.`}
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
                          {isLoading ? (
                            <span className="skeleton-line skeleton-line--sm" />
                          ) : r.subtopicIndex != null ? (
                            `Subtopic ${r.subtopicIndex + 1}`
                          ) : (
                            <span className="muted-text">Unassigned</span>
                          )}
                        </span>
                      </div>
                      <div className="student-card-row">
                        <span className="student-card-key">Role</span>
                        <span className="student-card-val">
                          {isLoading ? (
                            <span className="skeleton-line skeleton-line--sm" />
                          ) : roleMeta ? (
                            <Badge tone={roleMeta.tone}>{roleMeta.label}</Badge>
                          ) : (
                            <span className="muted-text">Unassigned</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredRows.length === 0 && (
                <div className="empty-state">
                  {search.trim()
                    ? `No students match “${search}”. Try a different name or registration number.`
                    : `No ${filter === "selected" ? "assigned" : "unassigned"} students in this group yet.`}
                </div>
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
                    {o.members.length} {o.members.length === 1 ? "student" : "students"}
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
                          No one assigned
                        </p>
                      )}
                    </div>
                  ))}

                  {o.unassignedRole.length > 0 && (
                    <div>
                      <div className="role-group-head">
                        <Badge tone="neutral">Role pending</Badge>
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

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-bottom-bar no-print" aria-label="Group sections">
        <button
          type="button"
          className={`mobile-bottom-tab ${activeTab === "roster" ? "is-active" : ""}`}
          aria-current={activeTab === "roster" ? "page" : undefined}
          onClick={() => setActiveTab("roster")}
        >
          <UsersIcon size={20} variant={activeTab === "roster" ? "Bold" : "Linear"} />
          <span>Roster</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-tab ${activeTab === "subtopics" ? "is-active" : ""}`}
          aria-current={activeTab === "subtopics" ? "page" : undefined}
          onClick={() => setActiveTab("subtopics")}
        >
          <BookOpenIcon size={20} variant={activeTab === "subtopics" ? "Bold" : "Linear"} />
          <span>Subtopics</span>
        </button>
      </nav>
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
