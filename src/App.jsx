import { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";

const SB_URL = "https://xlddlwqfqldnqwdbuiie.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZGRsd3FmcWxkbnF3ZGJ1aWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTYxNDIsImV4cCI6MjA4OTMzMjE0Mn0.4NHR2nhet-StNgX94w55IFOJBITo3JGA6fUXYK1xJVo";

async function sb(path, { method = "GET", body, prefer, token } = {}) {
  const headers = { "Content-Type": "application/json", apikey: SB_KEY };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (prefer) headers["Prefer"] = prefer;
  const res = await fetch(`${SB_URL}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (res.status === 204 || res.headers.get("content-length") === "0") return null;
  const text = await res.text();
  if (!text) return null;
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Invalid response from server"); }
  if (!res.ok) throw new Error(data?.message || data?.error_description || "Request failed");
  return data;
}

async function loginAuth(email, password) {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || "Invalid credentials");
  return data;
}

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = (e) => {
      const lines = e.target.result.split(/[\n\r,;]+/).map((l) => l.trim().replace(/^["']+|["']+$/g, "")).filter((l) => l && l.includes(".") && !/^(website|url|domain|http)/i.test(l));
      resolve([...new Set(lines)]);
    };
    r.readAsText(file);
  });
}

const C = {
  bg: "#f0f2f5", surface: "#ffffff", border: "#e2e8f0", borderLight: "#edf2f7",
  text: "#1e293b", textDim: "#64748b", textFaint: "#94a3b8",
  accent: "#4a6fa5", accentBg: "#f0f4f9",
  green: "#16a34a", greenBg: "#f0fdf4", blue: "#2563eb", blueBg: "#eff6ff",
  red: "#dc2626", redBg: "#fef2f2", orange: "#ea580c", orangeBg: "#fff7ed",
  navBg: "#2c3e5a",
  shadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg: "0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)",
};

const css = {
  input: { width: "100%", padding: "10px 14px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" },
  select: { padding: "8px 12px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", cursor: "pointer" },
  numInput: { width: 70, padding: "7px 10px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, outline: "none", textAlign: "center", boxSizing: "border-box" },
};

function Btn({ children, onClick, disabled, variant = "primary", small, style: s }) {
  const base = { padding: small ? "6px 14px" : "9px 20px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 12 : 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap" };
  const v = { primary: { background: C.accent, color: "#fff" }, success: { background: C.green, color: "#fff" }, ghost: { background: "transparent", border: `1px solid ${C.border}`, color: C.textDim }, danger: { background: C.redBg, border: "1px solid #fecaca", color: C.red }, warning: { background: C.orangeBg, border: "1px solid #fed7aa", color: C.orange } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...s }}>{children}</button>;
}

function Badge({ children, color = C.accent, bg }) {
  return <span style={{ background: bg || `${color}12`, color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

function Check({ checked, onChange, color = C.blue, disabled }) {
  return (
    <div onClick={disabled ? undefined : onChange} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? color : C.border}`, background: checked ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>
      {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
    </div>
  );
}

function Spinner({ size = 18, color = C.accent }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style><circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="3" strokeDasharray="32 32" strokeLinecap="round" /></svg>;
}

function Loading() { return <div style={{ padding: 60, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.textDim }}><Spinner /> Loading...</div>; }
function Empty({ icon = "📭", text }) { return <div style={{ padding: 60, textAlign: "center", color: C.textFaint, fontSize: 14 }}><div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>{text}</div>; }
function ErrorMsg({ msg, onRetry }) { if (!msg) return null; return <div style={{ background: C.redBg, border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13, display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><span style={{ flex: 1 }}>{msg}</span>{onRetry && <Btn onClick={onRetry} variant="ghost" small>Retry</Btn>}</div>; }

function StatCard({ label, value, color = C.textDim, bg }) {
  return <div style={{ background: bg || "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 20px", minWidth: 90, textAlign: "center", boxShadow: C.shadow }}><div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div><div style={{ fontSize: 11, color: C.textDim, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{label}</div></div>;
}

function Table({ columns, rows, emptyText = "No data" }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "auto", boxShadow: C.shadow }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: columns.length * 100 }}>
        <thead><tr style={{ background: C.bg }}>{columns.map((col) => <th key={col.key} style={{ padding: "12px 16px", textAlign: col.align || "left", fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{col.label}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length}><Empty text={emptyText} /></td></tr>}
          {rows.map((row, i) => (
            <tr key={row._key || i} style={{ borderTop: i > 0 ? `1px solid ${C.borderLight}` : "none" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {columns.map((col) => <td key={col.key} style={{ padding: "12px 16px", textAlign: col.align || "left", fontSize: 13, color: C.text }}>{col.render ? col.render(row, i) : row[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function NotificationBell({ alerts }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const visible = alerts.filter((a) => !dismissed.has(a.id));
  const count = visible.length;
  const dismiss = (id) => setDismissed((p) => new Set([...p, id]));
  const dismissAll = () => setDismissed(new Set(alerts.map((a) => a.id)));
  const daysAgo = (d) => Math.floor((new Date() - new Date(d)) / 86400000);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ background: open ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", position: "relative" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {count > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: C.red, color: "#fff", borderRadius: 10, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, padding: "0 4px" }}>{count}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 360, maxHeight: 420, overflow: "auto", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadowLg, zIndex: 100 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Notifications</span>
            {count > 0 && <button onClick={dismissAll} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Dismiss all</button>}
          </div>
          {count === 0 ? <div style={{ padding: 32, textAlign: "center", color: C.textFaint, fontSize: 13 }}>No notifications</div> : visible.map((a) => (
            <div key={a.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.orangeBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>⚠️</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}><span style={{ fontWeight: 600 }}>{a.repName}</span> hasn't opened any website from <span style={{ fontWeight: 600 }}>{a.listName}</span></div><div style={{ fontSize: 11, color: C.textFaint, marginTop: 3 }}>Assigned {daysAgo(a.assignedAt)} days ago</div></div>
              <button onClick={() => dismiss(a.id)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", fontSize: 14, padding: "0 2px", flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const submit = async () => {
    if (!email || !pw) return setError("Enter email and password");
    setLoading(true); setError("");
    try { const auth = await loginAuth(email, pw); const profiles = await sb(`/rest/v1/profiles?id=eq.${auth.user.id}&select=*`, { token: auth.access_token }); if (!profiles?.[0]) throw new Error("Profile not found."); onLogin({ token: auth.access_token, user: auth.user, profile: profiles[0] }); } catch (e) { setError(e.message); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #2c3e5a 0%, #4a6fa5 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "44px 38px", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: C.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🎯</div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Prospecting</h1>
          <p style={{ color: C.textFaint, fontSize: 13, margin: "6px 0 0" }}>Sign in to your account</p>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Email" type="email" style={{ ...css.input, marginBottom: 12 }} />
        <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" type="password" style={{ ...css.input, marginBottom: 16 }} />
        <ErrorMsg msg={error} />
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: 12, background: C.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading && <Spinner size={16} color="#fff" />} {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ alerts }) {
  const { session, logout } = useApp();
  const { profile } = session;
  const isManager = profile.role === "manager";
  return (
    <div style={{ background: C.navBg, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>🎯</span><span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Prospecting</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Badge color="#fff" bg="rgba(255,255,255,0.15)">{profile.role.toUpperCase()}</Badge>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{profile.full_name}</span>
        {isManager && alerts && <NotificationBell alerts={alerts} />}
        <button onClick={logout} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "rgba(255,255,255,0.8)", cursor: "pointer", padding: "5px 14px", fontSize: 13, fontWeight: 500 }}>Logout</button>
      </div>
    </div>
  );
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onDone }) {
  const { session } = useApp();
  const [name, setName] = useState(""); const [provider, setProvider] = useState(""); const [state, setState] = useState("");
  const [urls, setUrls] = useState([]); const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const handleFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setFileName(f.name); const p = await parseCSV(f); setUrls(p); setError(p.length === 0 ? "No valid URLs found" : ""); } catch { setError("Failed to read file"); } };
  const submit = async () => {
    if (!name.trim()) return setError("Enter a list name"); if (urls.length === 0) return setError("Upload a file with URLs");
    setLoading(true); setError("");
    try {
      const list = await sb("/rest/v1/lists?select=*", { method: "POST", prefer: "return=representation", token: session.token, body: { name: name.trim(), provider: provider.trim() || null, state: state.trim() || null } });
      if (!list?.[0]?.id) throw new Error("Failed to create list");
      const rows = urls.map((url, i) => ({ list_id: list[0].id, url, position: i + 1 }));
      for (let i = 0; i < rows.length; i += 100) await sb("/rest/v1/websites", { method: "POST", token: session.token, body: rows.slice(i, i + 100) });
      onDone();
    } catch (e) { setError(e.message); } setLoading(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700, color: C.text }}>Upload New List</h2>
        {[{ l: "List Name *", v: name, s: setName, p: "e.g. Florida Dentists Q1" }, { l: "Provider", v: provider, s: setProvider, p: "Optional" }, { l: "State", v: state, s: setState, p: "Optional" }].map((f) => (
          <div key={f.l} style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>{f.l}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p} style={css.input} /></div>
        ))}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>CSV File *</label>
          <label style={{ display: "block", padding: 22, background: C.bg, border: `2px dashed ${C.border}`, borderRadius: 8, textAlign: "center", cursor: "pointer" }}>
            <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
            <div style={{ color: C.textDim, fontSize: 13 }}>{fileName || "Click to select CSV file"}</div>
            {urls.length > 0 && <div style={{ color: C.green, fontSize: 12, marginTop: 6, fontWeight: 600 }}>✓ {urls.length} unique websites found</div>}
          </label>
        </div>
        <ErrorMsg msg={error} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={submit} disabled={loading} variant="success">{loading && <Spinner size={14} color="#fff" />} {loading ? "Uploading..." : "Upload List"}</Btn></div>
      </div>
    </div>
  );
}

// ─── EDIT LIST MODAL ──────────────────────────────────────────────────────────
function EditListModal({ list, token, onClose, onDone }) {
  const [name, setName] = useState(list.name || "");
  const [provider, setProvider] = useState(list.provider || "");
  const [state, setState] = useState(list.state || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // CSV replace
  const [urls, setUrls] = useState([]);
  const [fileName, setFileName] = useState("");
  const [replaceCSV, setReplaceCSV] = useState(false);

  const handleFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { setFileName(f.name); const p = await parseCSV(f); setUrls(p); setError(p.length === 0 ? "No valid URLs found" : ""); } catch { setError("Failed to read file"); }
  };

  const submit = async () => {
    if (!name.trim()) return setError("Enter a list name");
    setLoading(true); setError("");
    try {
      // Update list details
      await sb(`/rest/v1/lists?id=eq.${list.id}`, { method: "PATCH", token, body: { name: name.trim(), provider: provider.trim() || null, state: state.trim() || null } });

      // Replace CSV if new file uploaded
      if (replaceCSV && urls.length > 0) {
        // Delete old websites
        await sb(`/rest/v1/websites?list_id=eq.${list.id}`, { method: "DELETE", token });
        // Delete old progress
        await sb(`/rest/v1/progress?website_id=not.is.null`, { method: "DELETE", token });
        // Delete old assignments
        await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token });
        // Insert new websites
        const rows = urls.map((url, i) => ({ list_id: list.id, url, position: i + 1 }));
        for (let i = 0; i < rows.length; i += 100) await sb("/rest/v1/websites", { method: "POST", token, body: rows.slice(i, i + 100) });
      }
      onDone();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700, color: C.text }}>Edit List</h2>
        {[{ l: "List Name *", v: name, s: setName, p: "List name" }, { l: "Provider", v: provider, s: setProvider, p: "Optional" }, { l: "State", v: state, s: setState, p: "Optional" }].map((f) => (
          <div key={f.l} style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>{f.l}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p} style={css.input} /></div>
        ))}

        {!replaceCSV ? (
          <div style={{ marginBottom: 18 }}>
            <Btn onClick={() => setReplaceCSV(true)} variant="danger" small>Replace CSV file</Btn>
            <p style={{ fontSize: 11, color: C.textFaint, marginTop: 6 }}>Warning: replacing the CSV will delete all existing websites, progress, and assignments for this list.</p>
          </div>
        ) : (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>New CSV File</label>
            <label style={{ display: "block", padding: 22, background: C.redBg, border: `2px dashed #fecaca`, borderRadius: 8, textAlign: "center", cursor: "pointer" }}>
              <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
              <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{fileName || "Click to select new CSV file"}</div>
              {urls.length > 0 && <div style={{ color: C.green, fontSize: 12, marginTop: 6, fontWeight: 600 }}>✓ {urls.length} unique websites found</div>}
            </label>
            <button onClick={() => { setReplaceCSV(false); setUrls([]); setFileName(""); }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12, marginTop: 6 }}>← Cancel CSV replacement</button>
          </div>
        )}

        <ErrorMsg msg={error} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
          <Btn onClick={submit} disabled={loading}>{loading && <Spinner size={14} color="#fff" />} {loading ? "Saving..." : "Save Changes"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ASSIGN MODAL ─────────────────────────────────────────────────────────────
function AssignModal({ list, reps, assignments, websiteCount, token, onClose, onDone }) {
  const existing = useMemo(() => assignments.map((a) => ({ rep_id: a.rep_id, name: a.profiles?.full_name || "Unknown", start: a.start_position || 1, end: a.end_position || websiteCount })), [assignments, websiteCount]);
  const [slots, setSlots] = useState(() => existing.length > 0 ? existing : []);
  const [selRep, setSelRep] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const usedRepIds = useMemo(() => new Set(slots.map((s) => s.rep_id)), [slots]);
  const addableReps = useMemo(() => reps.filter((r) => !usedRepIds.has(r.id)), [reps, usedRepIds]);
  const totalAssigned = slots.reduce((sum, s) => sum + Math.max(0, (s.end || 0) - (s.start || 0) + 1), 0);
  const unassigned = websiteCount - totalAssigned;
  const addRep = () => { if (!selRep) return; const rep = reps.find((r) => r.id === selRep); if (!rep) return; setSlots((p) => [...p, { rep_id: rep.id, name: rep.full_name, start: 0, end: 0 }]); setSelRep(""); };
  const removeSlot = (idx) => {
    setSlots((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) return next;
      // Recalculate positions after removal
      let pos = 1;
      return next.map((s) => {
        const c = Math.max(0, (s.end || 0) - (s.start || 0) + 1);
        const start = pos; pos += c;
        return { ...s, start, end: start + c - 1 };
      });
    });
  };
  const getCount = (s) => Math.max(0, (s.end || 0) - (s.start || 0) + 1);

  const setCount = (idx, v) => {
    const count = Math.max(0, parseInt(v) || 0);
    setSlots((prev) => {
      const next = [...prev];
      const oldCount = getCount(next[idx]);
      next[idx] = { ...next[idx], _manualCount: count };

      // Calculate remaining after this manual entry
      const remaining = websiteCount - count;
      const otherSlots = next.filter((_, i) => i !== idx);
      const otherTotal = otherSlots.reduce((sum, s, i2) => sum + getCount(prev[i2 < idx ? i2 : i2 + 1]), 0);

      // Redistribute remaining among other slots proportionally
      if (otherSlots.length > 0 && remaining >= 0) {
        const perOther = Math.floor(remaining / otherSlots.length);
        const rem = remaining % otherSlots.length;
        let otherIdx = 0;
        for (let i = 0; i < next.length; i++) {
          if (i === idx) continue;
          const c = perOther + (otherIdx < rem ? 1 : 0);
          next[i] = { ...next[i], _autoCount: c };
          otherIdx++;
        }
      }

      // Now recalculate positions
      let pos = 1;
      for (let i = 0; i < next.length; i++) {
        const c = i === idx ? count : (next[i]._autoCount !== undefined ? next[i]._autoCount : getCount(next[i]));
        next[i] = { ...next[i], start: pos, end: pos + Math.max(0, c) - 1 };
        pos += Math.max(0, c);
        delete next[i]._manualCount;
        delete next[i]._autoCount;
      }
      return next;
    });
  };

  const distributeEvenly = () => { if (!slots.length) return; const per = Math.floor(websiteCount / slots.length); const rem = websiteCount % slots.length; let pos = 1; setSlots((p) => p.map((s, i) => { const c = per + (i < rem ? 1 : 0); const st = pos; pos += c; return { ...s, start: st, end: st + c - 1 }; })); };
  const validate = () => { for (const s of slots) { if (s.start < 1 || s.end < 1 || s.start > s.end) return "Each rep must have a valid range"; if (s.end > websiteCount) return `Range exceeds total (${websiteCount})`; } const sorted = [...slots].sort((a, b) => a.start - b.start); for (let i = 1; i < sorted.length; i++) { if (sorted[i].start <= sorted[i - 1].end) return "Ranges overlap"; } return null; };
  const submit = async () => {
    if (!slots.length) return setError("Add at least one rep"); const err = validate(); if (err) return setError(err);
    setLoading(true); setError("");
    try { await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token }); for (const s of slots) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: s.rep_id, start_position: s.start, end_position: s.end } }); onDone(); } catch (e) { setError(e.message); } setLoading(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 540, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: C.text }}>Assign Reps — {list.name}</h2>
        <p style={{ color: C.textDim, fontSize: 13, margin: "0 0 20px" }}>{websiteCount} websites total</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <StatCard label="Total" value={websiteCount} color={C.textDim} />
          <StatCard label="Assigned" value={totalAssigned} color={C.green} bg={C.greenBg} />
          <StatCard label="Unassigned" value={Math.max(0, unassigned)} color={unassigned > 0 ? C.red : C.textFaint} bg={unassigned > 0 ? C.redBg : C.bg} />
        </div>
        {slots.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, padding: "8px 0", fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase" }}><div style={{ flex: 1 }}>Rep</div><div style={{ width: 80, textAlign: "center" }}>Count</div><div style={{ width: 70, textAlign: "center" }}>From</div><div style={{ width: 70, textAlign: "center" }}>To</div><div style={{ width: 32 }}></div></div>
            {slots.map((s, i) => (
              <div key={s.rep_id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.borderLight}` }}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: C.text }}>{s.name}</div>
                <input value={getCount(s) || ""} onChange={(e) => setCount(i, e.target.value)} style={css.numInput} placeholder="0" />
                <input value={s.start || ""} style={{ ...css.numInput, background: C.bg, color: C.textDim }} readOnly />
                <input value={s.end || ""} style={{ ...css.numInput, background: C.bg, color: C.textDim }} readOnly />
                <button onClick={() => removeSlot(i)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: C.redBg, color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {addableReps.length > 0 && (<><select value={selRep} onChange={(e) => setSelRep(e.target.value)} style={css.select}><option value="">Add a rep...</option>{addableReps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select><Btn onClick={addRep} disabled={!selRep} small>+ Add</Btn></>)}
          {slots.length > 0 && <Btn onClick={distributeEvenly} variant="ghost" small>Distribute evenly</Btn>}
        </div>
        <ErrorMsg msg={error} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={submit} disabled={loading}>{loading && <Spinner size={14} color="#fff" />} {loading ? "Saving..." : "Save Assignments"}</Btn></div>
      </div>
    </div>
  );
}

// ─── REASSIGN MODAL ───────────────────────────────────────────────────────────
function ReassignModal({ list, reps, assignments, websites, progress, token, onClose, onDone }) {
  const [fromRep, setFromRep] = useState("");
  const [toRep, setToRep] = useState("");
  const [mode, setMode] = useState("unvisited");
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fromAssignment = assignments.find((a) => a.rep_id === fromRep);
  const toAssignment = assignments.find((a) => a.rep_id === toRep);
  const toRepIsNew = toRep && !toAssignment;

  const fromWebsites = useMemo(() => {
    if (!fromAssignment) return [];
    const s = fromAssignment.start_position || 1;
    const e = fromAssignment.end_position || 999999;
    return websites.filter((w) => w.position >= s && w.position <= e);
  }, [fromAssignment, websites]);

  const unvisitedFromWebsites = useMemo(() => {
    return fromWebsites.filter((w) => {
      const p = progress.find((pr) => pr.website_id === w.id && pr.rep_id === fromRep);
      return !p?.visited;
    });
  }, [fromWebsites, progress, fromRep]);

  const togglePosition = (pos) => {
    setSelectedPositions((prev) => { const next = new Set(prev); next.has(pos) ? next.delete(pos) : next.add(pos); return next; });
  };

  const getMovingWebsites = () => {
    if (mode === "all") return fromWebsites;
    if (mode === "unvisited") return unvisitedFromWebsites;
    return fromWebsites.filter((w) => selectedPositions.has(w.position));
  };

  const submit = async () => {
    if (!fromRep || !toRep) return setError("Select both reps");
    if (fromRep === toRep) return setError("Can't reassign to the same rep");
    const moving = getMovingWebsites();
    if (moving.length === 0) return setError("No websites to move");

    setLoading(true); setError("");
    try {
      const movingPositions = moving.map((w) => w.position).sort((a, b) => a - b);
      const remainingFromPositions = fromWebsites.filter((w) => !movingPositions.includes(w.position)).map((w) => w.position).sort((a, b) => a - b);

      let newToPositions;
      if (toAssignment) {
        const toStart = toAssignment.start_position || 0;
        const toEnd = toAssignment.end_position || 0;
        const toPositions = websites.filter((w) => w.position >= toStart && w.position <= toEnd).map((w) => w.position);
        newToPositions = [...toPositions, ...movingPositions].sort((a, b) => a - b);
      } else {
        newToPositions = [...movingPositions].sort((a, b) => a - b);
      }

      // Delete old assignments
      await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${fromRep}`, { method: "DELETE", token });
      if (toAssignment) await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${toRep}`, { method: "DELETE", token });

      if (remainingFromPositions.length > 0) {
        await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: fromRep, start_position: Math.min(...remainingFromPositions), end_position: Math.max(...remainingFromPositions) } });
      }
      if (newToPositions.length > 0) {
        await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: toRep, start_position: Math.min(...newToPositions), end_position: Math.max(...newToPositions) } });
      }
      onDone();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const movingCount = getMovingWebsites().length;

  // All reps for "To Rep" dropdown (except the from rep)
  const toRepOptions = reps.filter((r) => r.id !== fromRep);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: C.text }}>Reassign Websites</h2>
        <p style={{ color: C.textDim, fontSize: 13, margin: "0 0 20px" }}>Move websites from one rep to another</p>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>From Rep</label>
            <select value={fromRep} onChange={(e) => { setFromRep(e.target.value); setSelectedPositions(new Set()); setToRep(""); }} style={{ ...css.select, width: "100%" }}>
              <option value="">Select...</option>
              {assignments.map((a) => <option key={a.rep_id} value={a.rep_id}>{a.profiles?.full_name} (#{a.start_position}–#{a.end_position})</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4, fontSize: 18 }}>→</div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>To Rep</label>
            <select value={toRep} onChange={(e) => setToRep(e.target.value)} style={{ ...css.select, width: "100%" }}>
              <option value="">Select...</option>
              {toRepOptions.map((r) => {
                const a = assignments.find((a) => a.rep_id === r.id);
                const label = a ? `${r.full_name} (#{a.start_position}–#{a.end_position})` : `${r.full_name} (not on this list)`;
                return <option key={r.id} value={r.id}>{label}</option>;
              })}
            </select>
          </div>
        </div>

        {toRepIsNew && (
          <div style={{ background: C.blueBg, border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.blue, marginBottom: 16 }}>
            This rep is not currently on this list — they will be added with the moved websites.
          </div>
        )}

        {fromRep && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 8, fontWeight: 600 }}>What to move</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["unvisited", `Unvisited (${unvisitedFromWebsites.length})`], ["all", `All (${fromWebsites.length})`], ["selected", "Select manually"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setMode(val)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${mode === val ? C.accent : C.border}`, background: mode === val ? C.accentBg : "transparent", color: mode === val ? C.accent : C.textDim, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{lbl}</button>
                ))}
              </div>
            </div>

            {mode === "selected" && fromWebsites.length > 0 && (
              <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16 }}>
                {fromWebsites.map((w) => {
                  const p = progress.find((pr) => pr.website_id === w.id && pr.rep_id === fromRep);
                  const visited = p?.visited;
                  return (
                    <div key={w.id} onClick={() => togglePosition(w.position)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer", background: selectedPositions.has(w.position) ? C.blueBg : "transparent" }}>
                      <Check checked={selectedPositions.has(w.position)} color={C.accent} />
                      <span style={{ fontSize: 12, color: C.textFaint, width: 30 }}>#{w.position}</span>
                      <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{w.url}</span>
                      {visited && <Badge color={C.blue} bg={C.blueBg}>Visited</Badge>}
                    </div>
                  );
                })}
              </div>
            )}

            {movingCount > 0 && (
              <div style={{ background: C.orangeBg, border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.orange, marginBottom: 16 }}>
                {movingCount} website{movingCount !== 1 ? "s" : ""} will be moved{toRep ? ` to ${reps.find((r) => r.id === toRep)?.full_name}` : ""}
              </div>
            )}
          </>
        )}

        <ErrorMsg msg={error} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
          <Btn onClick={submit} disabled={loading || !fromRep || !toRep || movingCount === 0} variant="warning">
            {loading && <Spinner size={14} color="#fff" />} {loading ? "Moving..." : `Move ${movingCount} Website${movingCount !== 1 ? "s" : ""}`}
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
  const [websites, setWebsites] = useState([]); const [progress, setProgress] = useState([]); const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [showAssign, setShowAssign] = useState(false); const [showReassign, setShowReassign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [currentList, setCurrentList] = useState(list);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ls, ws, prog, asgn] = await Promise.all([
        sb(`/rest/v1/lists?id=eq.${currentList.id}&select=*`, { token: t }),
        sb(`/rest/v1/websites?list_id=eq.${currentList.id}&order=position.asc&select=*`, { token: t }),
        sb(`/rest/v1/progress?select=*`, { token: t }),
        sb(`/rest/v1/assignments?list_id=eq.${currentList.id}&select=*,profiles(full_name,id)`, { token: t }),
      ]);
      if (ls?.[0]) setCurrentList(ls[0]);
      setWebsites(ws || []); setProgress(prog || []); setAssignments(asgn || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [currentList.id, t]);

  useEffect(() => { load(); }, [load]);

  const repStats = useCallback((a) => {
    const s = a.start_position || 1; const e = a.end_position || websites.length;
    const rws = websites.filter((w) => w.position >= s && w.position <= e);
    const ids = new Set(rws.map((w) => w.id));
    const rp = progress.filter((p) => p.rep_id === a.rep_id && ids.has(p.website_id));
    return { total: rws.length, visited: rp.filter((p) => p.visited).length, claimed: rp.filter((p) => p.claimed).length, notOpen: rp.filter((p) => p.not_open).length };
  }, [progress, websites]);

  if (loading) return <Loading />;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0, fontWeight: 600 }}>← Back to Lists</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>{currentList.name}</h2>
        {currentList.provider && <Badge color={C.accent} bg={C.accentBg}>{currentList.provider}</Badge>}
        {currentList.state && <Badge color={C.textDim} bg={C.bg}>{currentList.state}</Badge>}
        <Btn onClick={() => setShowEdit(true)} variant="ghost" small>✏️ Edit</Btn>
      </div>
      <p style={{ color: C.textFaint, fontSize: 12, margin: "0 0 20px" }}>{websites.length} websites</p>
      <ErrorMsg msg={error} onRetry={load} />

      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: C.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.04em" }}>Assigned Reps</div>
          <div style={{ display: "flex", gap: 8 }}>
            {assignments.length >= 1 && <Btn onClick={() => setShowReassign(true)} variant="warning" small>↔ Reassign</Btn>}
            <Btn onClick={() => setShowAssign(true)} small>{assignments.length > 0 ? "Edit Assignments" : "Assign Reps"}</Btn>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {assignments.length === 0 && <span style={{ color: C.textFaint, fontSize: 13 }}>No reps assigned — click "Assign Reps" to get started</span>}
          {assignments.map((a) => {
            const s = repStats(a);
            return (
              <div key={a.rep_id} style={{ background: C.greenBg, border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", minWidth: 180 }}>
                <div style={{ fontWeight: 600, color: C.green, fontSize: 14, marginBottom: 4 }}>{a.profiles?.full_name}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6 }}>Websites {a.start_position || 1}–{a.end_position || websites.length} ({s.total})</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textDim }}><span>👁 {s.visited}/{s.total}</span><span>✅ {s.claimed}</span><span>🚫 {s.notOpen}</span></div>
              </div>
            );
          })}
        </div>
      </div>

      <Table
        columns={[
          { key: "#", label: "#", render: (w) => <span style={{ color: C.textFaint }}>{w.position}</span> },
          { key: "url", label: "Website", render: (w) => <a href={w.url.startsWith("http") ? w.url : `https://${w.url}`} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 13, textDecoration: "none", fontWeight: 500 }}>{w.url}</a> },
          { key: "assignedTo", label: "Assigned To", render: (w) => { const a = assignments.find((a) => w.position >= (a.start_position || 1) && w.position <= (a.end_position || websites.length)); return a ? <Badge color={C.green} bg={C.greenBg}>{a.profiles?.full_name}</Badge> : <span style={{ color: C.textFaint }}>—</span>; }},
          ...assignments.map((a) => ({
            key: `s_${a.rep_id}`, label: a.profiles?.full_name || "Rep", align: "center",
            render: (w) => {
              if (w.position < (a.start_position || 1) || w.position > (a.end_position || websites.length)) return <span style={{ color: C.borderLight }}>—</span>;
              const p = progress.find((p) => p.website_id === w.id && p.rep_id === a.rep_id);
              return <div style={{ display: "flex", justifyContent: "center", gap: 8, fontSize: 13 }}><span title="Visited">{p?.visited ? "👁" : "·"}</span><span title="Claimed">{p?.claimed ? "✅" : "·"}</span><span title="Not Open">{p?.not_open ? "🚫" : "·"}</span></div>;
            },
          })),
        ]}
        rows={websites.map((w) => ({ ...w, _key: w.id }))}
        emptyText="No websites in this list"
      />

      {showAssign && <AssignModal list={currentList} reps={reps} assignments={assignments} websiteCount={websites.length} token={t} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); load(); }} />}
      {showReassign && <ReassignModal list={currentList} reps={reps} assignments={assignments} websites={websites} progress={progress} token={t} onClose={() => setShowReassign(false)} onDone={() => { setShowReassign(false); load(); }} />}
      {showEdit && <EditListModal list={currentList} token={t} onClose={() => setShowEdit(false)} onDone={() => { setShowEdit(false); load(); }} />}
    </div>
  );
}

// ─── MANAGER: REP OVERVIEW ───────────────────────────────────────────────────
function MgrRepOverview({ reps, lists }) {
  const { session } = useApp();
  const [progress, setProgress] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { sb("/rest/v1/progress?select=*", { token: session.token }).then((d) => { setProgress(d || []); setLoading(false); }).catch(() => setLoading(false)); }, [session.token]);
  if (loading) return <Loading />;
  return (
    <Table columns={[
      { key: "name", label: "Rep", render: (r) => <span style={{ fontWeight: 600, color: C.text }}>{r.full_name}</span> },
      { key: "assigned", label: "Lists", render: (r) => lists.filter((l) => l.assignments?.some((a) => a.rep_id === r.id)).length },
      { key: "visited", label: "Visited", align: "center", render: (r) => <Badge color={C.blue} bg={C.blueBg}>{progress.filter((p) => p.rep_id === r.id && p.visited).length}</Badge> },
      { key: "claimed", label: "Claimed", align: "center", render: (r) => <Badge color={C.green} bg={C.greenBg}>{progress.filter((p) => p.rep_id === r.id && p.claimed).length}</Badge> },
      { key: "notOpen", label: "Not Open", align: "center", render: (r) => <Badge color={C.red} bg={C.redBg}>{progress.filter((p) => p.rep_id === r.id && p.not_open).length}</Badge> },
    ]} rows={reps.map((r) => ({ ...r, _key: r.id }))} emptyText="No reps found" />
  );
}

// ─── MANAGER APP ──────────────────────────────────────────────────────────────
function ManagerApp({ onAlerts }) {
  const { session } = useApp();
  const t = session.token;
  const [view, setView] = useState("lists"); const [lists, setLists] = useState([]); const [reps, setReps] = useState([]);
  const [selected, setSelected] = useState(null); const [showUpload, setShowUpload] = useState(false);
  const [fProv, setFProv] = useState(""); const [fState, setFState] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ls, rs, prog] = await Promise.all([
        sb("/rest/v1/lists?select=*,assignments(rep_id,start_position,end_position,created_at,profiles(full_name))&order=created_at.desc", { token: t }),
        sb("/rest/v1/profiles?role=eq.rep&select=*&order=full_name.asc", { token: t }),
        sb("/rest/v1/progress?select=*", { token: t }),
      ]);
      setLists(ls || []); setReps(rs || []);
      const now = new Date(); const newAlerts = [];
      for (const list of (ls || [])) {
        if (!list.assignments) continue;
        for (const a of list.assignments) {
          if (!a.created_at) continue;
          if (Math.floor((now - new Date(a.created_at)) / 86400000) < 7) continue;
          if (!(prog || []).some((p) => p.rep_id === a.rep_id && p.visited)) {
            newAlerts.push({ id: `${list.id}_${a.rep_id}`, listName: list.name, repName: a.profiles?.full_name || "Unknown", assignedAt: a.created_at });
          }
        }
      }
      setAlerts(newAlerts);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (onAlerts) onAlerts(alerts); }, [alerts, onAlerts]);

  const providers = useMemo(() => [...new Set(lists.map((l) => l.provider).filter(Boolean))].sort(), [lists]);
  const states = useMemo(() => [...new Set(lists.map((l) => l.state).filter(Boolean))].sort(), [lists]);
  const filtered = useMemo(() => lists.filter((l) => (!fProv || l.provider === fProv) && (!fState || l.state === fState)), [lists, fProv, fState]);

  if (selected) return <MgrListDetail list={selected} reps={reps} onBack={() => { setSelected(null); load(); }} />;

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {[["lists", "📋 Lists"], ["reps", "👥 Reps"]].map(([id, lbl]) => <Btn key={id} onClick={() => setView(id)} variant={view === id ? "primary" : "ghost"} small>{lbl}</Btn>)}
        <div style={{ flex: 1 }} />
        <Btn onClick={() => setShowUpload(true)} variant="success">+ Upload List</Btn>
      </div>
      <ErrorMsg msg={error} onRetry={load} />
      {view === "lists" && (
        <>
          {(providers.length > 1 || states.length > 1) && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {providers.length > 1 && <select value={fProv} onChange={(e) => setFProv(e.target.value)} style={css.select}><option value="">All Providers</option>{providers.map((p) => <option key={p}>{p}</option>)}</select>}
              {states.length > 1 && <select value={fState} onChange={(e) => setFState(e.target.value)} style={css.select}><option value="">All States</option>{states.map((s) => <option key={s}>{s}</option>)}</select>}
              {(fProv || fState) && <Btn onClick={() => { setFProv(""); setFState(""); }} variant="danger" small>Clear</Btn>}
            </div>
          )}
          {loading ? <Loading /> : (
            <Table columns={[
              { key: "name", label: "List Name", render: (l) => <span style={{ fontWeight: 600, cursor: "pointer", color: C.accent }} onClick={() => setSelected(l)}>{l.name}</span> },
              { key: "provider", label: "Provider", render: (l) => l.provider ? <Badge color={C.accent} bg={C.accentBg}>{l.provider}</Badge> : <span style={{ color: C.textFaint }}>—</span> },
              { key: "state", label: "State", render: (l) => l.state ? <Badge color={C.textDim} bg={C.bg}>{l.state}</Badge> : <span style={{ color: C.textFaint }}>—</span> },
              { key: "assigned", label: "Assigned", render: (l) => l.assignments?.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{l.assignments.map((a) => <Badge key={a.rep_id} color={C.green} bg={C.greenBg}>{a.profiles?.full_name}</Badge>)}</div> : <span style={{ color: C.textFaint, fontSize: 12 }}>Unassigned</span> },
              { key: "actions", label: "", align: "right", render: (l) => <Btn onClick={() => setSelected(l)} variant="ghost" small>Manage →</Btn> },
            ]} rows={filtered.map((l) => ({ ...l, _key: l.id }))} emptyText="No lists yet — upload one to get started" />
          )}
        </>
      )}
      {view === "reps" && <MgrRepOverview reps={reps} lists={lists} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
    </>
  );
}

// ─── REP: LIST VIEW ──────────────────────────────────────────────────────────
function RepListView({ list, assignment, onBack }) {
  const { session } = useApp();
  const t = session.token; const repId = session.user.id;
  const startPos = assignment?.start_position || 1; const endPos = assignment?.end_position || 999999;
  const [websites, setWebsites] = useState([]); const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ws, prog] = await Promise.all([
        sb(`/rest/v1/websites?list_id=eq.${list.id}&position=gte.${startPos}&position=lte.${endPos}&order=position.asc&select=*`, { token: t }),
        sb(`/rest/v1/progress?rep_id=eq.${repId}&select=*`, { token: t }),
      ]);
      setWebsites(ws || []); const map = {}; (prog || []).forEach((p) => { map[p.website_id] = p; }); setProgress(map);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [list.id, startPos, endPos, repId, t]);

  useEffect(() => { load(); }, [load]);

  const upsert = async (wId, field, value) => {
    const ex = progress[wId];
    setProgress((p) => ({ ...p, [wId]: { ...ex, [field]: value, website_id: wId, rep_id: repId } }));
    try {
      if (ex?.id) { await sb(`/rest/v1/progress?id=eq.${ex.id}`, { method: "PATCH", token: t, body: { [field]: value, updated_at: new Date().toISOString() } }); }
      else { const res = await sb("/rest/v1/progress?select=*", { method: "POST", prefer: "return=representation", token: t, body: { website_id: wId, rep_id: repId, [field]: value } }); if (res?.[0]) setProgress((p) => ({ ...p, [wId]: res[0] })); }
    } catch (e) { setProgress((p) => ({ ...p, [wId]: ex })); setError(`Failed: ${e.message}`); }
  };

  const visit = (w) => { window.open(w.url.startsWith("http") ? w.url : `https://${w.url}`, "_blank"); if (!progress[w.id]?.visited) upsert(w.id, "visited", true); };
  const vals = Object.values(progress).filter((p) => websites.some((w) => w.id === p.website_id));
  const stats = { total: websites.length, visited: vals.filter((p) => p.visited).length, claimed: vals.filter((p) => p.claimed).length, notOpen: vals.filter((p) => p.not_open).length };

  if (loading) return <Loading />;
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0, fontWeight: 600 }}>← Back</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>{list.name}</h2>
        {list.provider && <Badge color={C.accent} bg={C.accentBg}>{list.provider}</Badge>}
        {list.state && <Badge color={C.textDim} bg={C.bg}>{list.state}</Badge>}
      </div>
      <p style={{ color: C.textDim, fontSize: 12, margin: "2px 0 0" }}>Your assigned websites: #{startPos}–#{endPos}</p>
      <div style={{ display: "flex", gap: 10, margin: "16px 0 20px", flexWrap: "wrap" }}>
        <StatCard label="Assigned" value={stats.total} color={C.textDim} />
        <StatCard label="Visited" value={stats.visited} color={C.blue} bg={C.blueBg} />
        <StatCard label="Claimed" value={stats.claimed} color={C.green} bg={C.greenBg} />
        <StatCard label="Not Open" value={stats.notOpen} color={C.red} bg={C.redBg} />
      </div>
      <ErrorMsg msg={error} />
      <Table columns={[
        { key: "#", label: "#", render: (w) => <span style={{ color: C.textFaint }}>{w.position}</span> },
        { key: "url", label: "Website", render: (w) => <button onClick={() => visit(w)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13, padding: 0, textAlign: "left", fontWeight: 500 }}>{w.url}</button> },
        { key: "visited", label: "Visited", align: "center", render: (w) => <Check checked={!!progress[w.id]?.visited} color={C.blue} disabled /> },
        { key: "claimed", label: "Claimed", align: "center", render: (w) => <Check checked={!!progress[w.id]?.claimed} color={C.green} onChange={() => upsert(w.id, "claimed", !progress[w.id]?.claimed)} /> },
        { key: "notOpen", label: "Not Open", align: "center", render: (w) => <Check checked={!!progress[w.id]?.not_open} color={C.red} onChange={() => upsert(w.id, "not_open", !progress[w.id]?.not_open)} /> },
      ]} rows={websites.map((w) => ({ ...w, _key: w.id }))} emptyText="No websites assigned to you" />
    </div>
  );
}

// ─── REP APP ──────────────────────────────────────────────────────────────────
function RepApp() {
  const { session } = useApp();
  const [assignedLists, setAssignedLists] = useState([]); const [selected, setSelected] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    sb(`/rest/v1/assignments?rep_id=eq.${session.user.id}&select=*,lists(*)`, { token: session.token })
      .then((d) => { setAssignedLists((d || []).filter((a) => a.lists)); setLoading(false); }).catch(() => setLoading(false));
  }, [session.user.id, session.token]);

  if (selected) return <RepListView list={selected.lists} assignment={selected} onBack={() => setSelected(null)} />;
  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: C.text }}>My Assigned Lists</h2>
      {loading ? <Loading /> : assignedLists.length === 0 ? <Empty text="No lists assigned yet" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {assignedLists.map((a) => {
            const l = a.lists; const count = (a.end_position || 0) - (a.start_position || 0) + 1;
            return (
              <div key={`${a.list_id}_${a.rep_id}`} onClick={() => setSelected(a)} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, cursor: "pointer", transition: "all 0.15s", boxShadow: C.shadow }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = C.shadowMd; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = C.shadow; }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: C.text }}>{l.name}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>{count > 0 ? `${count} websites (#${a.start_position}–#${a.end_position})` : "All websites"}</div>
                <div style={{ display: "flex", gap: 6 }}>{l.provider && <Badge color={C.accent} bg={C.accentBg}>{l.provider}</Badge>}{l.state && <Badge color={C.textDim} bg={C.bg}>{l.state}</Badge>}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const logout = useCallback(() => setSession(null), []);
  if (!session) return <LoginScreen onLogin={setSession} />;
  const isManager = session.profile?.role === "manager";
  return (
    <AppCtx.Provider value={{ session, logout }}>
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>
        <Header alerts={isManager ? alerts : []} />
        <div style={{ padding: "24px 28px", width: "100%", boxSizing: "border-box", flex: 1 }}>
          {isManager ? <ManagerApp onAlerts={setAlerts} /> : <RepApp />}
        </div>
      </div>
    </AppCtx.Provider>
  );
}