import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SB_URL = "https://xlddlwqfqldnqwdbuiie.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZGRsd3FmcWxkbnF3ZGJ1aWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTYxNDIsImV4cCI6MjA4OTMzMjE0Mn0.4NHR2nhet-StNgX94w55IFOJBITo3JGA6fUXYK1xJVo";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
async function sb(path, { method = "GET", body, prefer, token } = {}) {
  const headers = { "Content-Type": "application/json", apikey: SB_KEY };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (prefer) headers["Prefer"] = prefer;

  const res = await fetch(`${SB_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204 || res.headers.get("content-length") === "0") return null;

  const text = await res.text();
  if (!text) return null;

  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Invalid response from server"); }
  if (!res.ok) throw new Error(data?.message || data?.error_description || "Request failed");
  return data;
}

async function login(email, password) {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SB_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || "Invalid credentials");
  return data;
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = (e) => {
      const lines = e.target.result
        .split(/[\n\r,;]+/)
        .map((l) => l.trim().replace(/^["']+|["']+$/g, ""))
        .filter((l) => l && l.includes(".") && !/^(website|url|domain|http)/i.test(l));
      resolve([...new Set(lines)]);
    };
    r.readAsText(file);
  });
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0b0e14", surface: "#131620", raised: "#1a1f2e", border: "#1e2536",
  borderLight: "#2a3148", text: "#e2e8f0", textDim: "#8892a8", textFaint: "#4a5268",
  accent: "#7c6aef", accentLight: "#9d8ff5", green: "#22c997", greenDim: "#1a9e78",
  blue: "#4a9eff", red: "#f06292", redDim: "#e74c7a",
};

const css = {
  input: {
    width: "100%", padding: "10px 14px", background: C.raised, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  select: {
    padding: "8px 12px", background: C.raised, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 13, outline: "none", cursor: "pointer",
  },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = "primary", small, style: s }) {
  const base = {
    padding: small ? "5px 12px" : "9px 18px", borderRadius: 8, border: "none",
    cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 12 : 14,
    fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
    opacity: disabled ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap",
  };
  const v = {
    primary: { background: `linear-gradient(135deg, ${C.accent}, #5b4bc9)`, color: "#fff" },
    success: { background: `linear-gradient(135deg, ${C.green}, #17b384)`, color: "#fff" },
    ghost: { background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, color: C.textDim },
    danger: { background: "rgba(240,98,146,0.12)", border: `1px solid rgba(240,98,146,0.25)`, color: C.red },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...s }}>{children}</button>;
}

function Badge({ children, color = C.accent, bg }) {
  return (
    <span style={{ background: bg || `${color}18`, color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
      {children}
    </span>
  );
}

function Check({ checked, onChange, color = C.blue, disabled }) {
  return (
    <div onClick={disabled ? undefined : onChange} style={{
      width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? color : C.borderLight}`,
      background: checked ? color : "transparent", display: "flex", alignItems: "center",
      justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0,
    }}>
      {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
    </div>
  );
}

function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" fill="none" stroke={C.accent} strokeWidth="3" strokeDasharray="32 32" strokeLinecap="round" />
    </svg>
  );
}

function Loading() {
  return <div style={{ padding: 60, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.textDim }}><Spinner /> Loading...</div>;
}

function Empty({ icon = "📭", text }) {
  return <div style={{ padding: 60, textAlign: "center", color: C.textFaint, fontSize: 14 }}><div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>{text}</div>;
}

function ErrorMsg({ msg, onRetry }) {
  if (!msg) return null;
  return (
    <div style={{ background: "rgba(240,98,146,0.08)", border: `1px solid rgba(240,98,146,0.2)`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13, display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ flex: 1 }}>{msg}</span>
      {onRetry && <Btn onClick={onRetry} variant="ghost" small>Retry</Btn>}
    </div>
  );
}

function StatCard({ label, value, color = C.textDim }) {
  return (
    <div style={{ background: `${color}10`, border: `1px solid ${color}20`, borderRadius: 10, padding: "12px 18px", minWidth: 80, textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textDim, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

function Table({ columns, rows, emptyText = "No data" }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: columns.length * 120 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.02)" }}>
            {columns.map((col) => (
              <th key={col.key} style={{ padding: "12px 16px", textAlign: col.align || "left", fontSize: 10, fontWeight: 700, color: col.color || C.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length}><Empty text={emptyText} /></td></tr>}
          {rows.map((row, i) => (
            <tr key={row._key || i} style={{ borderTop: `1px solid ${C.border}` }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "11px 16px", textAlign: col.align || "left", fontSize: 13, color: C.text }}>
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !pw) return setError("Enter email and password");
    setLoading(true); setError("");
    try {
      const auth = await login(email, pw);
      const profiles = await sb(`/rest/v1/profiles?id=eq.${auth.user.id}&select=*`, { token: auth.access_token });
      if (!profiles?.[0]) throw new Error("Profile not found. Contact your manager.");
      onLogin({ token: auth.access_token, user: auth.user, profile: profiles[0] });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.bg}, #111827, #0f172a)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "44px 38px", width: 340 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: `linear-gradient(135deg, ${C.accent}, #5b4bc9)`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🎯</div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Prospecting</h1>
          <p style={{ color: C.textFaint, fontSize: 13, margin: "6px 0 0" }}>Sign in to continue</p>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Email" type="email" style={{ ...css.input, marginBottom: 12 }} />
        <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" type="password" style={{ ...css.input, marginBottom: 16 }} />
        <ErrorMsg msg={error} />
        <button onClick={submit} disabled={loading} style={{
          width: "100%", padding: 12, background: `linear-gradient(135deg, ${C.accent}, #5b4bc9)`, border: "none",
          borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {loading && <Spinner size={16} />} {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header() {
  const { session, logout } = useApp();
  const { profile } = session;
  const isManager = profile.role === "manager";

  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Prospecting</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Badge color={isManager ? C.accent : C.green}>{profile.role.toUpperCase()}</Badge>
        <span style={{ color: C.textDim, fontSize: 13 }}>{profile.full_name}</span>
        <Btn onClick={logout} variant="ghost" small>Logout</Btn>
      </div>
    </div>
  );
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onDone }) {
  const { session } = useApp();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [state, setState] = useState("");
  const [urls, setUrls] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setFileName(f.name);
      const parsed = await parseCSV(f);
      setUrls(parsed);
      setError(parsed.length === 0 ? "No valid URLs found in file" : "");
    } catch { setError("Failed to read file"); }
  };

  const submit = async () => {
    if (!name.trim() || !provider.trim() || !state.trim()) return setError("Fill in all fields");
    if (urls.length === 0) return setError("Upload a file with URLs");
    setLoading(true); setError("");
    try {
      const list = await sb("/rest/v1/lists?select=*", {
        method: "POST", prefer: "return=representation", token: session.token,
        body: { name: name.trim(), provider: provider.trim(), state: state.trim() },
      });
      if (!list?.[0]?.id) throw new Error("Failed to create list");
      const listId = list[0].id;
      const rows = urls.map((url, i) => ({ list_id: listId, url, position: i + 1 }));
      const BATCH = 100;
      for (let i = 0; i < rows.length; i += BATCH) {
        await sb("/rest/v1/websites", { method: "POST", token: session.token, body: rows.slice(i, i + BATCH) });
      }
      onDone();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fields = [
    { label: "List Name", val: name, set: setName, ph: "e.g. Florida Dentists Q1" },
    { label: "Provider", val: provider, set: setProvider, ph: "e.g. ZoomInfo" },
    { label: "State", val: state, set: setState, ph: "e.g. Florida" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.raised, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 32, width: 440, maxWidth: "90vw" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700, color: C.text }}>Upload New List</h2>
        {fields.map((f) => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
            <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph} style={css.input} />
          </div>
        ))}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>CSV File</label>
          <label style={{ display: "block", padding: 20, background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 8, textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}>
            <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
            <div style={{ color: C.textDim, fontSize: 13 }}>{fileName || "Click to select CSV file"}</div>
            {urls.length > 0 && <div style={{ color: C.green, fontSize: 12, marginTop: 6, fontWeight: 600 }}>✓ {urls.length} unique websites found</div>}
          </label>
        </div>
        <ErrorMsg msg={error} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
          <Btn onClick={submit} disabled={loading} variant="success">
            {loading && <Spinner size={14} />} {loading ? "Uploading..." : "Upload List"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── MANAGER: LIST DETAIL ─────────────────────────────────────────────────────
function MgrListDetail({ list, reps, onBack }) {
  const { session } = useApp();
  const t = session.token;
  const [websites, setWebsites] = useState([]);
  const [progress, setProgress] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignRep, setAssignRep] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ws, prog, asgn] = await Promise.all([
        sb(`/rest/v1/websites?list_id=eq.${list.id}&order=position.asc&select=*`, { token: t }),
        sb(`/rest/v1/progress?select=*`, { token: t }),
        sb(`/rest/v1/assignments?list_id=eq.${list.id}&select=*,profiles(full_name,id)`, { token: t }),
      ]);
      setWebsites(ws || []); setProgress(prog || []); setAssignments(asgn || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [list.id, t]);

  useEffect(() => { load(); }, [load]);

  const assign = async () => {
    if (!assignRep) return;
    try {
      await sb("/rest/v1/assignments", { method: "POST", token: t, body: { list_id: list.id, rep_id: assignRep } });
      setAssignRep(""); load();
    } catch (e) { setError(e.message); }
  };

  const unassign = async (repId) => {
    try {
      await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${repId}`, { method: "DELETE", token: t });
      load();
    } catch (e) { setError(e.message); }
  };

  const wsIds = useMemo(() => new Set(websites.map((w) => w.id)), [websites]);
  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.rep_id)), [assignments]);
  const unassignedReps = useMemo(() => reps.filter((r) => !assignedIds.has(r.id)), [reps, assignedIds]);

  const repStats = useCallback((repId) => {
    const rp = progress.filter((p) => p.rep_id === repId && wsIds.has(p.website_id));
    return { visited: rp.filter((p) => p.visited).length, claimed: rp.filter((p) => p.claimed).length, notOpen: rp.filter((p) => p.not_open).length };
  }, [progress, wsIds]);

  if (loading) return <Loading />;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>← Back to Lists</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>{list.name}</h2>
        <Badge>{list.provider}</Badge>
        <Badge color={C.textDim}>{list.state}</Badge>
      </div>
      <p style={{ color: C.textFaint, fontSize: 12, margin: "0 0 20px" }}>{websites.length} websites</p>
      <ErrorMsg msg={error} onRetry={load} />

      {/* Assignments */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>Assigned Reps</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: assignments.length > 0 ? 14 : 0 }}>
          {assignments.length === 0 && <span style={{ color: C.textFaint, fontSize: 13 }}>No reps assigned yet</span>}
          {assignments.map((a) => {
            const s = repStats(a.rep_id);
            return (
              <div key={a.rep_id} style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 10, padding: "10px 14px", minWidth: 160 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: C.green, fontSize: 13 }}>{a.profiles?.full_name}</span>
                  <button onClick={() => unassign(a.rep_id)} style={{ background: `${C.red}18`, border: "none", borderRadius: 4, color: C.red, cursor: "pointer", padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textDim }}>
                  <span>👁 {s.visited}/{websites.length}</span>
                  <span>✅ {s.claimed}</span>
                  <span>🚫 {s.notOpen}</span>
                </div>
              </div>
            );
          })}
        </div>
        {unassignedReps.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <select value={assignRep} onChange={(e) => setAssignRep(e.target.value)} style={css.select}>
              <option value="">Select rep...</option>
              {unassignedReps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
            <Btn onClick={assign} disabled={!assignRep} small>Assign</Btn>
          </div>
        )}
      </div>

      {/* Website Table */}
      <Table
        columns={[
          { key: "#", label: "#", render: (_, i) => <span style={{ color: C.textFaint }}>{i + 1}</span> },
          { key: "url", label: "Website", render: (w) => <a href={w.url.startsWith("http") ? w.url : `https://${w.url}`} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 13, textDecoration: "none" }}>{w.url}</a> },
          ...assignments.map((a) => ({
            key: a.rep_id, label: a.profiles?.full_name || "Rep", align: "center",
            render: (w) => {
              const p = progress.find((p) => p.website_id === w.id && p.rep_id === a.rep_id);
              return (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, fontSize: 13 }}>
                  <span title="Visited">{p?.visited ? "👁" : "·"}</span>
                  <span title="Claimed">{p?.claimed ? "✅" : "·"}</span>
                  <span title="Not Open">{p?.not_open ? "🚫" : "·"}</span>
                </div>
              );
            },
          })),
        ]}
        rows={websites.map((w) => ({ ...w, _key: w.id }))}
        emptyText="No websites in this list"
      />
    </div>
  );
}

// ─── MANAGER: REP OVERVIEW ───────────────────────────────────────────────────
function MgrRepOverview({ reps, lists }) {
  const { session } = useApp();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb("/rest/v1/progress?select=*", { token: session.token })
      .then((d) => { setProgress(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session.token]);

  if (loading) return <Loading />;

  return (
    <Table
      columns={[
        { key: "name", label: "Rep", render: (r) => <span style={{ fontWeight: 600 }}>{r.full_name}</span> },
        { key: "assigned", label: "Lists", render: (r) => lists.filter((l) => l.assignments?.some((a) => a.rep_id === r.id)).length },
        { key: "visited", label: "Visited", align: "center", color: C.blue, render: (r) => <Badge color={C.blue}>{progress.filter((p) => p.rep_id === r.id && p.visited).length}</Badge> },
        { key: "claimed", label: "Claimed", align: "center", color: C.green, render: (r) => <Badge color={C.green}>{progress.filter((p) => p.rep_id === r.id && p.claimed).length}</Badge> },
        { key: "notOpen", label: "Not Open", align: "center", color: C.red, render: (r) => <Badge color={C.red}>{progress.filter((p) => p.rep_id === r.id && p.not_open).length}</Badge> },
      ]}
      rows={reps.map((r) => ({ ...r, _key: r.id }))}
      emptyText="No reps found"
    />
  );
}

// ─── MANAGER APP ──────────────────────────────────────────────────────────────
function ManagerApp() {
  const { session } = useApp();
  const t = session.token;
  const [view, setView] = useState("lists");
  const [lists, setLists] = useState([]);
  const [reps, setReps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [fProv, setFProv] = useState("");
  const [fState, setFState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ls, rs] = await Promise.all([
        sb("/rest/v1/lists?select=*,assignments(rep_id,profiles(full_name))&order=created_at.desc", { token: t }),
        sb("/rest/v1/profiles?role=eq.rep&select=*&order=full_name.asc", { token: t }),
      ]);
      setLists(ls || []); setReps(rs || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const providers = useMemo(() => [...new Set(lists.map((l) => l.provider))].filter(Boolean).sort(), [lists]);
  const states = useMemo(() => [...new Set(lists.map((l) => l.state))].filter(Boolean).sort(), [lists]);
  const filtered = useMemo(() => lists.filter((l) => (!fProv || l.provider === fProv) && (!fState || l.state === fState)), [lists, fProv, fState]);

  if (selected) return <MgrListDetail list={selected} reps={reps} onBack={() => { setSelected(null); load(); }} />;

  const listCols = [
    { key: "name", label: "List Name", render: (l) => <span style={{ fontWeight: 600, cursor: "pointer", color: C.text }} onClick={() => setSelected(l)}>{l.name}</span> },
    { key: "provider", label: "Provider", render: (l) => <Badge>{l.provider}</Badge> },
    { key: "state", label: "State", render: (l) => <span style={{ color: C.textDim }}>{l.state}</span> },
    { key: "assigned", label: "Assigned", render: (l) => l.assignments?.length > 0
      ? <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{l.assignments.map((a) => <Badge key={a.rep_id} color={C.green}>{a.profiles?.full_name}</Badge>)}</div>
      : <span style={{ color: C.textFaint, fontSize: 12 }}>Unassigned</span>
    },
    { key: "actions", label: "", align: "right", render: (l) => <Btn onClick={() => setSelected(l)} variant="ghost" small>Manage →</Btn> },
  ];

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {[["lists", "📋 Lists"], ["reps", "👥 Reps"]].map(([id, lbl]) => (
          <Btn key={id} onClick={() => setView(id)} variant={view === id ? "primary" : "ghost"} small>{lbl}</Btn>
        ))}
        <div style={{ flex: 1 }} />
        <Btn onClick={() => setShowUpload(true)} variant="success">+ Upload List</Btn>
      </div>

      <ErrorMsg msg={error} onRetry={load} />

      {view === "lists" && (
        <>
          {(providers.length > 1 || states.length > 1) && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {providers.length > 1 && (
                <select value={fProv} onChange={(e) => setFProv(e.target.value)} style={css.select}>
                  <option value="">All Providers</option>
                  {providers.map((p) => <option key={p}>{p}</option>)}
                </select>
              )}
              {states.length > 1 && (
                <select value={fState} onChange={(e) => setFState(e.target.value)} style={css.select}>
                  <option value="">All States</option>
                  {states.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
              {(fProv || fState) && <Btn onClick={() => { setFProv(""); setFState(""); }} variant="danger" small>Clear</Btn>}
            </div>
          )}
          {loading ? <Loading /> : <Table columns={listCols} rows={filtered.map((l) => ({ ...l, _key: l.id }))} emptyText="No lists yet — upload one to get started" />}
        </>
      )}
      {view === "reps" && <MgrRepOverview reps={reps} lists={lists} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
    </>
  );
}

// ─── REP: LIST VIEW ──────────────────────────────────────────────────────────
function RepListView({ list, onBack }) {
  const { session } = useApp();
  const t = session.token;
  const repId = session.user.id;
  const [websites, setWebsites] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ws, prog] = await Promise.all([
        sb(`/rest/v1/websites?list_id=eq.${list.id}&order=position.asc&select=*`, { token: t }),
        sb(`/rest/v1/progress?rep_id=eq.${repId}&select=*`, { token: t }),
      ]);
      setWebsites(ws || []);
      const map = {};
      (prog || []).forEach((p) => { map[p.website_id] = p; });
      setProgress(map);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [list.id, repId, t]);

  useEffect(() => { load(); }, [load]);

  const upsert = async (websiteId, field, value) => {
    const existing = progress[websiteId];
    const optimistic = { ...existing, [field]: value, website_id: websiteId, rep_id: repId };
    setProgress((prev) => ({ ...prev, [websiteId]: optimistic }));
    try {
      if (existing?.id) {
        await sb(`/rest/v1/progress?id=eq.${existing.id}`, { method: "PATCH", token: t, body: { [field]: value, updated_at: new Date().toISOString() } });
      } else {
        const res = await sb("/rest/v1/progress?select=*", { method: "POST", prefer: "return=representation", token: t, body: { website_id: websiteId, rep_id: repId, [field]: value } });
        if (res?.[0]) setProgress((prev) => ({ ...prev, [websiteId]: res[0] }));
      }
    } catch (e) {
      setProgress((prev) => ({ ...prev, [websiteId]: existing }));
      setError(`Failed to update: ${e.message}`);
    }
  };

  const visit = (w) => {
    window.open(w.url.startsWith("http") ? w.url : `https://${w.url}`, "_blank");
    if (!progress[w.id]?.visited) upsert(w.id, "visited", true);
  };

  const vals = Object.values(progress);
  const stats = { total: websites.length, visited: vals.filter((p) => p.visited).length, claimed: vals.filter((p) => p.claimed).length, notOpen: vals.filter((p) => p.not_open).length };

  if (loading) return <Loading />;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>← Back</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>{list.name}</h2>
        <Badge>{list.provider}</Badge>
        <Badge color={C.textDim}>{list.state}</Badge>
      </div>
      <div style={{ display: "flex", gap: 10, margin: "16px 0 20px", flexWrap: "wrap" }}>
        <StatCard label="Total" value={stats.total} color={C.textDim} />
        <StatCard label="Visited" value={stats.visited} color={C.blue} />
        <StatCard label="Claimed" value={stats.claimed} color={C.green} />
        <StatCard label="Not Open" value={stats.notOpen} color={C.red} />
      </div>
      <ErrorMsg msg={error} />
      <Table
        columns={[
          { key: "#", label: "#", render: (_, i) => <span style={{ color: C.textFaint }}>{i + 1}</span> },
          { key: "url", label: "Website", render: (w) => <button onClick={() => visit(w)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13, padding: 0, textAlign: "left" }}>{w.url}</button> },
          { key: "visited", label: "Visited", align: "center", color: C.blue, render: (w) => <Check checked={!!progress[w.id]?.visited} color={C.blue} disabled /> },
          { key: "claimed", label: "Claimed", align: "center", color: C.green, render: (w) => <Check checked={!!progress[w.id]?.claimed} color={C.green} onChange={() => upsert(w.id, "claimed", !progress[w.id]?.claimed)} /> },
          { key: "notOpen", label: "Not Open", align: "center", color: C.red, render: (w) => <Check checked={!!progress[w.id]?.not_open} color={C.red} onChange={() => upsert(w.id, "not_open", !progress[w.id]?.not_open)} /> },
        ]}
        rows={websites.map((w) => ({ ...w, _key: w.id }))}
        emptyText="No websites in this list"
      />
    </div>
  );
}

// ─── REP APP ──────────────────────────────────────────────────────────────────
function RepApp() {
  const { session } = useApp();
  const [lists, setLists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb(`/rest/v1/assignments?rep_id=eq.${session.user.id}&select=*,lists(*)`, { token: session.token })
      .then((d) => { setLists((d || []).map((a) => a.lists).filter(Boolean)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session.user.id, session.token]);

  if (selected) return <RepListView list={selected} onBack={() => setSelected(null)} />;

  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: C.text }}>My Assigned Lists</h2>
      {loading ? <Loading /> : lists.length === 0 ? <Empty text="No lists assigned yet" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {lists.map((l) => (
            <div key={l.id} onClick={() => setSelected(l)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, color: C.text }}>{l.name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Badge>{l.provider}</Badge>
                <Badge color={C.textDim}>{l.state}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const logout = useCallback(() => setSession(null), []);

  if (!session) return <LoginScreen onLogin={setSession} />;

  const isManager = session.profile?.role === "manager";

  return (
    <AppCtx.Provider value={{ session, logout }}>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>
        <Header />
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box", flex: 1 }}>
          {isManager ? <ManagerApp /> : <RepApp />}
        </div>
      </div>
    </AppCtx.Provider>
  );
}