import { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";

const SB_URL = "https://xlddlwqfqldnqwdbuiie.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZGRsd3FmcWxkbnF3ZGJ1aWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTYxNDIsImV4cCI6MjA4OTMzMjE0Mn0.4NHR2nhet-StNgX94w55IFOJBITo3JGA6fUXYK1xJVo";

async function sb(path, { method = "GET", body, prefer, token } = {}) {
  const h = { "Content-Type": "application/json", apikey: SB_KEY };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (prefer) h["Prefer"] = prefer;
  const res = await fetch(`${SB_URL}${path}`, { method, headers: h, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (res.status === 204 || res.headers.get("content-length") === "0") return null;
  const text = await res.text();
  if (!text) return null;
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Invalid response"); }
  if (!res.ok) throw new Error(data?.message || data?.error_description || "Request failed");
  return data;
}

async function loginAuth(email, pw) {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY }, body: JSON.stringify({ email, password: pw }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || "Invalid credentials");
  return data;
}

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function parseCSV(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error("Failed to read file"));
    r.onload = (e) => {
      const lines = e.target.result.split(/[\n\r,;]+/).map((l) => l.trim().replace(/^["']+|["']+$/g, "")).filter((l) => l && l.includes(".") && !/^(website|url|domain|http)/i.test(l));
      res([...new Set(lines)]);
    };
    r.readAsText(file);
  });
}

const fmt = (d) => { if (!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#f7f6f3", card: "#ffffff", border: "#ebe9e5", borderLight: "#f0eeea",
  text: "#1e293b", dim: "#64748b", faint: "#a3a09a", muted: "#c4c0b8",
  accent: "#5b7fb5", accentBg: "#eef2f8", accentDark: "#3d5a80",
  green: "#4a9e6e", greenBg: "#edf7f0", blue: "#4a8fe7", blueBg: "#eef4fd",
  red: "#d45858", redBg: "#fdf0f0", amber: "#c4873b", amberBg: "#fdf5eb",
  sidebar: "#1b2e44", sideHover: "rgba(255,255,255,0.08)", sideActive: "rgba(255,255,255,0.12)",
  shadow: "0 1px 3px rgba(0,0,0,0.06)", shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
  shadowLg: "0 10px 30px rgba(0,0,0,0.12)",
};

const inputStyle = { width: "100%", padding: "9px 12px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#lg1)" />
      <path d="M20 10l2.5 5.5L28 16.5l-4 4 1 5.5-5-2.8-5 2.8 1-5.5-4-4 5.5-1z" fill="#fff" fillOpacity="0.95" />
      <circle cx="20" cy="27" r="2.5" fill="#fff" fillOpacity="0.6" />
    </svg>
  );
}

function LogoSmall() {
  return (
    <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
      <defs><linearGradient id="lgs" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#f97316" /><stop offset="50%" stopColor="#ec4899" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
      <rect width="40" height="40" rx="10" fill="url(#lgs)" />
      <path d="M20 10l2.5 5.5L28 16.5l-4 4 1 5.5-5-2.8-5 2.8 1-5.5-4-4 5.5-1z" fill="#fff" fillOpacity="0.95" />
    </svg>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = "primary", small, style: s }) {
  const base = { padding: small ? "5px 12px" : "8px 18px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 11 : 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, opacity: disabled ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap" };
  const v = {
    primary: { background: T.accent, color: "#fff" },
    success: { background: T.green, color: "#fff" },
    ghost: { background: "transparent", border: `1px solid ${T.border}`, color: T.dim },
    danger: { background: T.redBg, border: `1px solid #f5c4c4`, color: T.red },
    warning: { background: T.amberBg, border: `1px solid #f0d4a8`, color: T.amber },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...s }}>{children}</button>;
}

function Badge({ children, color = T.accent, bg }) {
  return <span style={{ background: bg || `${color}15`, color, padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>;
}

function Avatar({ name, size = 26, colors }) {
  const c = colors || ["#dbeafe", "#3b82f6"];
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return <div style={{ width: size, height: size, borderRadius: "50%", background: c[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: c[1], fontWeight: 600, flexShrink: 0, border: "2px solid #fff" }}>{initials}</div>;
}

const repColors = [["#dbeafe", "#3b82f6"], ["#fef3c7", "#d97706"], ["#fce7f3", "#db2777"], ["#d1fae5", "#059669"], ["#e0e7ff", "#4f46e5"], ["#fde2e2", "#dc2626"]];

function Check({ checked, onChange, color = T.blue, disabled }) {
  return (
    <div onClick={disabled ? undefined : onChange} style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${checked ? color : T.muted}`, background: checked ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>
      {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
    </div>
  );
}

function Spinner({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><circle cx="12" cy="12" r="10" fill="none" stroke={T.accent} strokeWidth="3" strokeDasharray="32 32" strokeLinecap="round" /></svg>;
}

function Loading() { return <div style={{ padding: 60, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: T.dim, fontSize: 13 }}><Spinner /> Loading...</div>; }
function Empty({ icon = "📭", text }) { return <div style={{ padding: 60, textAlign: "center", color: T.faint, fontSize: 13 }}><div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>{text}</div>; }
function Err({ msg, onRetry }) { if (!msg) return null; return <div style={{ background: T.redBg, border: "1px solid #f5c4c4", borderRadius: 8, padding: "9px 14px", color: T.red, fontSize: 12, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ flex: 1 }}>{msg}</span>{onRetry && <Btn onClick={onRetry} variant="ghost" small>Retry</Btn>}</div>; }

function Progress({ pct = 0, color = T.accent }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div style={{ background: T.borderLight, borderRadius: 20, height: 5, width: 64 }}><div style={{ background: color, borderRadius: 20, height: 5, width: `${Math.min(100, pct)}%`, transition: "width 0.3s" }} /></div>
      <span style={{ fontSize: 11, color: pct > 0 ? T.dim : T.muted, minWidth: 28 }}>{Math.round(pct)}%</span>
    </div>
  );
}

function StatCard({ label, value, color = T.text }) {
  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px", flex: "1 1 0", minWidth: 80 }}><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div></div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const go = async () => {
    if (!email || !pw) return setErr("Enter email and password");
    setLoading(true); setErr("");
    try { const a = await loginAuth(email, pw); const p = await sb(`/rest/v1/profiles?id=eq.${a.user.id}&select=*`, { token: a.access_token }); if (!p?.[0]) throw new Error("Profile not found."); onLogin({ token: a.access_token, user: a.user, profile: p[0] }); } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, #1b2e44 0%, #3d5a80 50%, #5b7fb5 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "48px 40px", width: 340, boxShadow: T.shadowLg }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-block", marginBottom: 14 }}><Logo size={48} /></div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Prospecting</h1>
          <p style={{ color: T.faint, fontSize: 13, margin: "6px 0 0" }}>Sign in to continue</p>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="Email" type="email" style={{ ...inputStyle, marginBottom: 10 }} />
        <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="Password" type="password" style={{ ...inputStyle, marginBottom: 14 }} />
        <Err msg={err} />
        <button onClick={go} disabled={loading} style={{ width: "100%", padding: 11, background: `linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading && <Spinner />} {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, alerts }) {
  const { session, logout } = useApp();
  const { profile } = session;
  const isManager = profile.role === "manager";
  const initials = (profile.full_name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const alertCount = (alerts || []).length;

  const items = isManager
    ? [["lists", "Lists", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6"], ["reps", "Reps", "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8z"]]
    : [["lists", "My Lists", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6"]];

  return (
    <div style={{ width: 210, background: T.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "20px 18px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={32} />
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>Prospecting</span>
      </div>

      <div style={{ padding: "0 10px", flex: 1 }}>
        {items.map(([id, label, d]) => (
          <div key={id} onClick={() => setView(id)} style={{ padding: "9px 12px", borderRadius: 8, background: view === id ? T.sideActive : "transparent", color: view === id ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: view === id ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, marginBottom: 2, transition: "all 0.1s" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            {label}
          </div>
        ))}
        {isManager && (
          <div onClick={() => setView("notifications")} style={{ padding: "9px 12px", borderRadius: 8, background: view === "notifications" ? T.sideActive : "transparent", color: view === "notifications" ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, marginBottom: 2 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
            Alerts
            {alertCount > 0 && <span style={{ marginLeft: "auto", background: "#f97316", color: "#fff", borderRadius: 10, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, padding: "0 4px" }}>{alertCount}</span>}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 18px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(91,127,181,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#b8cfe6", fontWeight: 600 }}>{initials}</div>
          <div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 500 }}>{profile.full_name}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textTransform: "capitalize" }}>{profile.role}</div>
          </div>
        </div>
        <button onClick={logout} style={{ width: "100%", padding: "6px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 11, fontWeight: 500 }}>Sign out</button>
      </div>
    </div>
  );
}

// ─── MODALS (Upload, Assign, Reassign, Edit) ─────────────────────────────────
function Modal({ children, onClose, width = 460 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", boxShadow: T.shadowLg }}>{children}</div>
    </div>
  );
}

function UploadModal({ onClose, onDone }) {
  const { session } = useApp();
  const [name, setName] = useState(""); const [provider, setProvider] = useState(""); const [state, setState] = useState("");
  const [urls, setUrls] = useState([]); const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const handleFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setFileName(f.name); const p = await parseCSV(f); setUrls(p); setError(p.length === 0 ? "No valid URLs found" : ""); } catch { setError("Failed to read file"); } };
  const submit = async () => {
    if (!name.trim()) return setError("Enter a list name"); if (urls.length === 0) return setError("Upload a CSV");
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
    <Modal onClose={onClose}>
      <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 600, color: T.text }}>Upload new list</h2>
      {[{ l: "List name *", v: name, s: setName, p: "e.g. Florida Dentists Q1" }, { l: "Provider", v: provider, s: setProvider, p: "Optional" }, { l: "State", v: state, s: setState, p: "Optional" }].map((f) => (
        <div key={f.l} style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, color: T.dim, marginBottom: 4, fontWeight: 500 }}>{f.l}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p} style={inputStyle} /></div>
      ))}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, color: T.dim, marginBottom: 4, fontWeight: 500 }}>CSV file *</label>
        <label style={{ display: "block", padding: 20, background: T.bg, border: `2px dashed ${T.border}`, borderRadius: 10, textAlign: "center", cursor: "pointer" }}>
          <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
          <div style={{ color: T.faint, fontSize: 12 }}>{fileName || "Click to select CSV"}</div>
          {urls.length > 0 && <div style={{ color: T.green, fontSize: 11, marginTop: 4, fontWeight: 600 }}>✓ {urls.length} websites found</div>}
        </label>
      </div>
      <Err msg={error} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={submit} disabled={loading} variant="success">{loading ? "Uploading..." : "Upload"}</Btn></div>
    </Modal>
  );
}

function AssignModal({ list, reps, assignments, websiteCount, token, onClose, onDone }) {
  const existing = useMemo(() => assignments.map((a) => ({ rep_id: a.rep_id, name: a.profiles?.full_name || "?", start: a.start_position || 1, end: a.end_position || websiteCount })), [assignments, websiteCount]);
  const [slots, setSlots] = useState(() => existing.length > 0 ? existing : []);
  const [selRep, setSelRep] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const usedIds = useMemo(() => new Set(slots.map((s) => s.rep_id)), [slots]);
  const addable = useMemo(() => reps.filter((r) => !usedIds.has(r.id)), [reps, usedIds]);
  const total = slots.reduce((s, x) => s + Math.max(0, (x.end || 0) - (x.start || 0) + 1), 0);
  const addRep = () => { if (!selRep) return; const r = reps.find((x) => x.id === selRep); if (r) setSlots((p) => [...p, { rep_id: r.id, name: r.full_name, start: 0, end: 0 }]); setSelRep(""); };
  const rmSlot = (i) => { setSlots((p) => { const n = p.filter((_, j) => j !== i); let pos = 1; return n.map((s) => { const c = Math.max(0, (s.end || 0) - (s.start || 0) + 1); const st = pos; pos += c; return { ...s, start: st, end: st + c - 1 }; }); }); };
  const gc = (s) => Math.max(0, (s.end || 0) - (s.start || 0) + 1);
  const setCount = (idx, v) => { const count = Math.max(0, parseInt(v) || 0); setSlots((prev) => { const n = [...prev]; const rem = websiteCount - count; const others = n.filter((_, i) => i !== idx); if (others.length > 0 && rem >= 0) { const per = Math.floor(rem / others.length); const r = rem % others.length; let oi = 0; for (let i = 0; i < n.length; i++) { if (i === idx) continue; n[i] = { ...n[i], _c: per + (oi < r ? 1 : 0) }; oi++; } } let pos = 1; for (let i = 0; i < n.length; i++) { const c = i === idx ? count : (n[i]._c !== undefined ? n[i]._c : gc(n[i])); n[i] = { ...n[i], start: pos, end: pos + Math.max(0, c) - 1 }; pos += Math.max(0, c); delete n[i]._c; } return n; }); };
  const distrib = () => { if (!slots.length) return; const p = Math.floor(websiteCount / slots.length); const r = websiteCount % slots.length; let pos = 1; setSlots((s) => s.map((x, i) => { const c = p + (i < r ? 1 : 0); const st = pos; pos += c; return { ...x, start: st, end: st + c - 1 }; })); };
  const validate = () => { for (const s of slots) { if (s.start < 1 || s.end < 1 || s.start > s.end) return "Invalid range"; if (s.end > websiteCount) return `Exceeds total (${websiteCount})`; } const sr = [...slots].sort((a, b) => a.start - b.start); for (let i = 1; i < sr.length; i++) if (sr[i].start <= sr[i - 1].end) return "Ranges overlap"; return null; };
  const submit = async () => { if (!slots.length) return setError("Add a rep"); const e = validate(); if (e) return setError(e); setLoading(true); setError(""); try { await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token }); for (const s of slots) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: s.rep_id, start_position: s.start, end_position: s.end } }); onDone(); } catch (e) { setError(e.message); } setLoading(false); };

  return (
    <Modal onClose={onClose} width={520}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: T.text }}>Assign reps — {list.name}</h2>
      <p style={{ color: T.dim, fontSize: 12, margin: "0 0 16px" }}>{websiteCount} websites</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total" value={websiteCount} /><StatCard label="Assigned" value={total} color={T.green} /><StatCard label="Open" value={Math.max(0, websiteCount - total)} color={websiteCount - total > 0 ? T.red : T.faint} />
      </div>
      {slots.length > 0 && <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, padding: "6px 0", fontSize: 10, fontWeight: 600, color: T.faint, textTransform: "uppercase" }}><div style={{ flex: 1 }}>Rep</div><div style={{ width: 70, textAlign: "center" }}>Count</div><div style={{ width: 55, textAlign: "center" }}>From</div><div style={{ width: 55, textAlign: "center" }}>To</div><div style={{ width: 24 }} /></div>
        {slots.map((s, i) => (
          <div key={s.rep_id} style={{ display: "flex", gap: 6, alignItems: "center", padding: "7px 0", borderTop: `1px solid ${T.borderLight}` }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}><Avatar name={s.name} size={22} colors={repColors[i % repColors.length]} /><span style={{ fontWeight: 500, fontSize: 13, color: T.text }}>{s.name}</span></div>
            <input value={gc(s) || ""} onChange={(e) => setCount(i, e.target.value)} style={{ width: 70, padding: "5px 8px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontSize: 12, textAlign: "center", outline: "none" }} placeholder="0" />
            <input value={s.start || ""} readOnly style={{ width: 55, padding: "5px 8px", background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: 6, color: T.faint, fontSize: 12, textAlign: "center" }} />
            <input value={s.end || ""} readOnly style={{ width: 55, padding: "5px 8px", background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: 6, color: T.faint, fontSize: 12, textAlign: "center" }} />
            <button onClick={() => rmSlot(i)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: T.redBg, color: T.red, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ))}
      </div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {addable.length > 0 && <><select value={selRep} onChange={(e) => setSelRep(e.target.value)} style={{ padding: "6px 10px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontSize: 12 }}><option value="">Add rep...</option>{addable.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select><Btn onClick={addRep} disabled={!selRep} small>+ Add</Btn></>}
        {slots.length > 0 && <Btn onClick={distrib} variant="ghost" small>Distribute evenly</Btn>}
      </div>
      <Err msg={error} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${T.border}`, paddingTop: 14 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save"}</Btn></div>
    </Modal>
  );
}

function ReassignModal({ list, reps, assignments, websites, progress, token, onClose, onDone }) {
  const [fromRep, setFromRep] = useState(""); const [toRep, setToRep] = useState("");
  const [mode, setMode] = useState("unvisited"); const [selPos, setSelPos] = useState(new Set());
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const fromA = assignments.find((a) => a.rep_id === fromRep);
  const toA = assignments.find((a) => a.rep_id === toRep);
  const fromWs = useMemo(() => { if (!fromA) return []; return websites.filter((w) => w.position >= (fromA.start_position || 1) && w.position <= (fromA.end_position || 999999)); }, [fromA, websites]);
  const unvisited = useMemo(() => fromWs.filter((w) => { const p = progress.find((pr) => pr.website_id === w.id && pr.rep_id === fromRep); return !p?.visited; }), [fromWs, progress, fromRep]);
  const moving = mode === "all" ? fromWs : mode === "unvisited" ? unvisited : fromWs.filter((w) => selPos.has(w.position));
  const mc = moving.length;
  const toOpts = reps.filter((r) => r.id !== fromRep);

  const submit = async () => {
    if (!fromRep || !toRep) return setError("Select both reps"); if (fromRep === toRep) return setError("Same rep"); if (!mc) return setError("Nothing to move");
    setLoading(true); setError("");
    try {
      const mp = moving.map((w) => w.position).sort((a, b) => a - b);
      const remFrom = fromWs.filter((w) => !mp.includes(w.position)).map((w) => w.position).sort((a, b) => a - b);
      let newTo;
      if (toA) { const toPs = websites.filter((w) => w.position >= (toA.start_position || 0) && w.position <= (toA.end_position || 0)).map((w) => w.position); newTo = [...toPs, ...mp].sort((a, b) => a - b); } else { newTo = [...mp].sort((a, b) => a - b); }
      await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${fromRep}`, { method: "DELETE", token });
      if (toA) await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${toRep}`, { method: "DELETE", token });
      if (remFrom.length > 0) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: fromRep, start_position: Math.min(...remFrom), end_position: Math.max(...remFrom) } });
      if (newTo.length > 0) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: toRep, start_position: Math.min(...newTo), end_position: Math.max(...newTo) } });
      onDone();
    } catch (e) { setError(e.message); } setLoading(false);
  };

  return (
    <Modal onClose={onClose} width={540}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Reassign websites</h2>
      <p style={{ color: T.dim, fontSize: 12, margin: "0 0 16px" }}>Move websites between reps</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: T.dim, marginBottom: 4, display: "block", fontWeight: 500 }}>From</label><select value={fromRep} onChange={(e) => { setFromRep(e.target.value); setSelPos(new Set()); setToRep(""); }} style={{ ...inputStyle, fontSize: 12 }}><option value="">Select...</option>{assignments.map((a) => <option key={a.rep_id} value={a.rep_id}>{a.profiles?.full_name} (#{a.start_position}–#{a.end_position})</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6, fontSize: 16, color: T.muted }}>→</div>
        <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: T.dim, marginBottom: 4, display: "block", fontWeight: 500 }}>To</label><select value={toRep} onChange={(e) => setToRep(e.target.value)} style={{ ...inputStyle, fontSize: 12 }}><option value="">Select...</option>{toOpts.map((r) => { const a = assignments.find((a) => a.rep_id === r.id); return <option key={r.id} value={r.id}>{r.full_name}{a ? ` (#${a.start_position}–#${a.end_position})` : " (new)"}</option>; })}</select></div>
      </div>
      {fromRep && <>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 6, fontWeight: 500 }}>What to move</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["unvisited", `Unvisited (${unvisited.length})`], ["all", `All (${fromWs.length})`], ["selected", "Manual"]].map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${mode === v ? T.accent : T.border}`, background: mode === v ? T.accentBg : "transparent", color: mode === v ? T.accent : T.dim, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{l}</button>
            ))}
          </div>
        </div>
        {mode === "selected" && <div style={{ maxHeight: 160, overflow: "auto", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 14 }}>
          {fromWs.map((w) => { const vis = progress.find((p) => p.website_id === w.id && p.rep_id === fromRep)?.visited; return (
            <div key={w.id} onClick={() => setSelPos((p) => { const n = new Set(p); n.has(w.position) ? n.delete(w.position) : n.add(w.position); return n; })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer", background: selPos.has(w.position) ? T.blueBg : "transparent" }}>
              <Check checked={selPos.has(w.position)} color={T.accent} /><span style={{ fontSize: 11, color: T.faint, width: 28 }}>#{w.position}</span><span style={{ fontSize: 12, color: T.text, flex: 1 }}>{w.url}</span>{vis && <Badge color={T.blue} bg={T.blueBg}>Visited</Badge>}
            </div>); })}
        </div>}
        {mc > 0 && <div style={{ background: T.amberBg, border: "1px solid #f0d4a8", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: T.amber, marginBottom: 14 }}>{mc} website{mc !== 1 ? "s" : ""} will be moved{toRep ? ` to ${reps.find((r) => r.id === toRep)?.full_name}` : ""}</div>}
      </>}
      <Err msg={error} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${T.border}`, paddingTop: 14 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={submit} disabled={loading || !fromRep || !toRep || !mc} variant="warning">{loading ? "Moving..." : `Move ${mc}`}</Btn></div>
    </Modal>
  );
}

function EditListModal({ list, token, onClose, onDone }) {
  const [name, setName] = useState(list.name || ""); const [provider, setProvider] = useState(list.provider || ""); const [state, setState] = useState(list.state || "");
  const [urls, setUrls] = useState([]); const [fileName, setFileName] = useState(""); const [replCSV, setReplCSV] = useState(false);
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const handleFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setFileName(f.name); const p = await parseCSV(f); setUrls(p); setError(p.length === 0 ? "No URLs found" : ""); } catch { setError("Failed"); } };
  const submit = async () => { if (!name.trim()) return setError("Name required"); setLoading(true); setError(""); try { await sb(`/rest/v1/lists?id=eq.${list.id}`, { method: "PATCH", token, body: { name: name.trim(), provider: provider.trim() || null, state: state.trim() || null } }); if (replCSV && urls.length > 0) { await sb(`/rest/v1/websites?list_id=eq.${list.id}`, { method: "DELETE", token }); await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token }); const rows = urls.map((u, i) => ({ list_id: list.id, url: u, position: i + 1 })); for (let i = 0; i < rows.length; i += 100) await sb("/rest/v1/websites", { method: "POST", token, body: rows.slice(i, i + 100) }); } onDone(); } catch (e) { setError(e.message); } setLoading(false); };
  return (
    <Modal onClose={onClose}>
      <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 600 }}>Edit list</h2>
      {[{ l: "Name *", v: name, s: setName }, { l: "Provider", v: provider, s: setProvider }, { l: "State", v: state, s: setState }].map((f) => (
        <div key={f.l} style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, color: T.dim, marginBottom: 4, fontWeight: 500 }}>{f.l}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} style={inputStyle} /></div>
      ))}
      {!replCSV ? <div style={{ marginBottom: 16 }}><Btn onClick={() => setReplCSV(true)} variant="danger" small>Replace CSV</Btn><p style={{ fontSize: 10, color: T.faint, marginTop: 4 }}>This deletes all websites & assignments.</p></div> :
        <div style={{ marginBottom: 16 }}><label style={{ display: "block", padding: 18, background: T.redBg, border: "2px dashed #f5c4c4", borderRadius: 8, textAlign: "center", cursor: "pointer" }}><input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} /><div style={{ color: T.red, fontSize: 12, fontWeight: 500 }}>{fileName || "Select new CSV"}</div>{urls.length > 0 && <div style={{ color: T.green, fontSize: 11, marginTop: 4 }}>✓ {urls.length} found</div>}</label><button onClick={() => { setReplCSV(false); setUrls([]); setFileName(""); }} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", fontSize: 11, marginTop: 4 }}>Cancel replace</button></div>}
      <Err msg={error} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save"}</Btn></div>
    </Modal>
  );
}

// ─── MANAGER: LIST DETAIL ─────────────────────────────────────────────────────
function MgrListDetail({ list, reps, onBack }) {
  const { session } = useApp();
  const t = session.token;
  const [ws, setWs] = useState([]); const [prog, setProg] = useState([]); const [asgn, setAsgn] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [showAssign, setShowAssign] = useState(false); const [showReassign, setShowReassign] = useState(false); const [showEdit, setShowEdit] = useState(false);
  const [curList, setCurList] = useState(list);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ls, w, p, a] = await Promise.all([sb(`/rest/v1/lists?id=eq.${curList.id}&select=*`, { token: t }), sb(`/rest/v1/websites?list_id=eq.${curList.id}&order=position.asc&select=*`, { token: t }), sb(`/rest/v1/progress?select=*`, { token: t }), sb(`/rest/v1/assignments?list_id=eq.${curList.id}&select=*,profiles(full_name,id)`, { token: t })]);
      if (ls?.[0]) setCurList(ls[0]); setWs(w || []); setProg(p || []); setAsgn(a || []);
    } catch (e) { setError(e.message); } setLoading(false);
  }, [curList.id, t]);
  useEffect(() => { load(); }, [load]);

  const repStat = useCallback((a) => {
    const rw = ws.filter((w) => w.position >= (a.start_position || 1) && w.position <= (a.end_position || ws.length));
    const ids = new Set(rw.map((w) => w.id));
    const rp = prog.filter((p) => p.rep_id === a.rep_id && ids.has(p.website_id));
    return { total: rw.length, visited: rp.filter((p) => p.visited).length, claimed: rp.filter((p) => p.claimed).length, notOpen: rp.filter((p) => p.not_open).length };
  }, [prog, ws]);

  if (loading) return <Loading />;
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 12, marginBottom: 14, padding: 0, fontWeight: 500 }}>← Back</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.text }}>{curList.name}</h2>
        {curList.provider && <Badge color={T.accent} bg={T.accentBg}>{curList.provider}</Badge>}
        {curList.state && <Badge color={T.dim} bg={T.bg}>{curList.state}</Badge>}
        <Btn onClick={() => setShowEdit(true)} variant="ghost" small>✏️ Edit</Btn>
      </div>
      <p style={{ color: T.faint, fontSize: 11, margin: "0 0 18px" }}>{ws.length} websites</p>
      <Err msg={error} onRetry={load} />

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: "0.04em" }}>Reps</span>
          <div style={{ display: "flex", gap: 6 }}>
            {asgn.length >= 1 && <Btn onClick={() => setShowReassign(true)} variant="warning" small>↔ Reassign</Btn>}
            <Btn onClick={() => setShowAssign(true)} small>{asgn.length > 0 ? "Edit" : "Assign"}</Btn>
          </div>
        </div>
        {asgn.length === 0 ? <span style={{ color: T.faint, fontSize: 12 }}>No reps assigned yet</span> :
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {asgn.map((a, i) => { const s = repStat(a); const pct = s.total > 0 ? (s.visited / s.total) * 100 : 0; return (
            <div key={a.rep_id} style={{ background: T.greenBg, border: "1px solid #c3e6d0", borderRadius: 10, padding: "12px 16px", minWidth: 170 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Avatar name={a.profiles?.full_name} size={24} colors={repColors[i % repColors.length]} /><span style={{ fontWeight: 600, color: T.green, fontSize: 13 }}>{a.profiles?.full_name}</span></div>
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 6 }}>#{a.start_position || 1}–#{a.end_position || ws.length} ({s.total})</div>
              <Progress pct={pct} color={T.green} />
              <div style={{ display: "flex", gap: 10, fontSize: 10, color: T.faint, marginTop: 6 }}><span>👁 {s.visited}</span><span>✅ {s.claimed}</span><span>🚫 {s.notOpen}</span></div>
            </div>); })}
        </div>}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
            {["#", "Website", "Assigned to", "Last activity", ...asgn.map((a) => a.profiles?.full_name || "Rep")].map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: i > 2 ? "center" : "left", fontSize: 10, fontWeight: 500, color: T.faint, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {ws.length === 0 && <tr><td colSpan={4 + asgn.length}><Empty text="No websites" /></td></tr>}
            {ws.map((w) => {
              const assigned = asgn.find((a) => w.position >= (a.start_position || 1) && w.position <= (a.end_position || ws.length));
              const wProg = prog.filter((p) => p.website_id === w.id);
              const lastAct = wProg.reduce((latest, p) => { const d = p.updated_at || p.created_at; return d && (!latest || new Date(d) > new Date(latest)) ? d : latest; }, null);
              return (
                <tr key={w.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: "9px 14px", fontSize: 11, color: T.muted }}>{w.position}</td>
                  <td style={{ padding: "9px 14px" }}><a href={w.url.startsWith("http") ? w.url : `https://${w.url}`} target="_blank" rel="noreferrer" style={{ color: T.blue, fontSize: 12, textDecoration: "none" }}>{w.url}</a></td>
                  <td style={{ padding: "9px 14px" }}>{assigned ? <Badge color={T.green} bg={T.greenBg}>{assigned.profiles?.full_name}</Badge> : <span style={{ color: T.muted }}>—</span>}</td>
                  <td style={{ padding: "9px 14px", fontSize: 11, color: T.faint }}>{fmt(lastAct)}</td>
                  {asgn.map((a) => {
                    if (w.position < (a.start_position || 1) || w.position > (a.end_position || ws.length)) return <td key={a.rep_id} style={{ padding: "9px 14px", textAlign: "center", color: T.borderLight }}>—</td>;
                    const p = prog.find((p) => p.website_id === w.id && p.rep_id === a.rep_id);
                    return <td key={a.rep_id} style={{ padding: "9px 14px", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", gap: 6, fontSize: 12 }}><span>{p?.visited ? "👁" : "·"}</span><span>{p?.claimed ? "✅" : "·"}</span><span>{p?.not_open ? "🚫" : "·"}</span></div></td>;
                  })}
                </tr>);
            })}
          </tbody>
        </table>
      </div>

      {showAssign && <AssignModal list={curList} reps={reps} assignments={asgn} websiteCount={ws.length} token={t} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); load(); }} />}
      {showReassign && <ReassignModal list={curList} reps={reps} assignments={asgn} websites={ws} progress={prog} token={t} onClose={() => setShowReassign(false)} onDone={() => { setShowReassign(false); load(); }} />}
      {showEdit && <EditListModal list={curList} token={t} onClose={() => setShowEdit(false)} onDone={() => { setShowEdit(false); load(); }} />}
    </div>
  );
}

// ─── MANAGER: ALERTS VIEW ─────────────────────────────────────────────────────
function AlertsView({ alerts }) {
  const daysAgo = (d) => Math.floor((new Date() - new Date(d)) / 86400000);
  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Alerts</h2>
      <p style={{ fontSize: 12, color: T.dim, marginBottom: 18 }}>Reps with no activity after 7+ days</p>
      {alerts.length === 0 ? <Empty icon="🔔" text="No alerts — all reps are active" /> :
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((a) => (
          <div key={a.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.amberBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.text }}><span style={{ fontWeight: 600 }}>{a.repName}</span> hasn't opened any website from <span style={{ fontWeight: 600 }}>{a.listName}</span></div>
              <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>Assigned {daysAgo(a.assignedAt)} days ago</div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ─── MANAGER: REP OVERVIEW ───────────────────────────────────────────────────
function MgrRepOverview({ reps, lists }) {
  const { session } = useApp();
  const [prog, setProg] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { sb("/rest/v1/progress?select=*", { token: session.token }).then((d) => { setProg(d || []); setLoading(false); }).catch(() => setLoading(false)); }, [session.token]);
  if (loading) return <Loading />;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
          {["Rep", "Lists", "Visited", "Claimed", "Not open", "Last active"].map((h) => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 500, color: T.faint, textTransform: "uppercase" }}>{h}</th>)}
        </tr></thead>
        <tbody>{reps.map((r, i) => {
          const rp = prog.filter((p) => p.rep_id === r.id);
          const lastAct = rp.reduce((l, p) => { const d = p.updated_at || p.created_at; return d && (!l || new Date(d) > new Date(l)) ? d : l; }, null);
          return (
            <tr key={r.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
              <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={r.full_name} size={26} colors={repColors[i % repColors.length]} /><span style={{ fontWeight: 500, fontSize: 13 }}>{r.full_name}</span></div></td>
              <td style={{ padding: "10px 14px", color: T.dim, fontSize: 13 }}>{lists.filter((l) => l.assignments?.some((a) => a.rep_id === r.id)).length}</td>
              <td style={{ padding: "10px 14px" }}><Badge color={T.blue} bg={T.blueBg}>{rp.filter((p) => p.visited).length}</Badge></td>
              <td style={{ padding: "10px 14px" }}><Badge color={T.green} bg={T.greenBg}>{rp.filter((p) => p.claimed).length}</Badge></td>
              <td style={{ padding: "10px 14px" }}><Badge color={T.red} bg={T.redBg}>{rp.filter((p) => p.not_open).length}</Badge></td>
              <td style={{ padding: "10px 14px", fontSize: 11, color: T.faint }}>{fmt(lastAct)}</td>
            </tr>);
        })}</tbody>
      </table>
    </div>
  );
}

// ─── MANAGER APP ──────────────────────────────────────────────────────────────
function ManagerApp({ view, setAlerts }) {
  const { session } = useApp();
  const t = session.token;
  const [lists, setLists] = useState([]); const [reps, setReps] = useState([]);
  const [selected, setSelected] = useState(null); const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [alerts, setLocalAlerts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ls, rs, pr] = await Promise.all([
        sb("/rest/v1/lists?select=*,assignments(rep_id,start_position,end_position,created_at,profiles(full_name))&order=created_at.desc", { token: t }),
        sb("/rest/v1/profiles?role=eq.rep&select=*&order=full_name.asc", { token: t }),
        sb("/rest/v1/progress?select=*", { token: t }),
      ]);
      setLists(ls || []); setReps(rs || []);
      const now = new Date(); const al = [];
      for (const l of (ls || [])) { if (!l.assignments) continue; for (const a of l.assignments) { if (!a.created_at) continue; if (Math.floor((now - new Date(a.created_at)) / 86400000) < 7) continue; if (!(pr || []).some((p) => p.rep_id === a.rep_id && p.visited)) al.push({ id: `${l.id}_${a.rep_id}`, listName: l.name, repName: a.profiles?.full_name || "?", assignedAt: a.created_at }); } }
      setLocalAlerts(al); setAlerts(al);
    } catch (e) { setError(e.message); } setLoading(false);
  }, [t, setAlerts]);

  useEffect(() => { load(); }, [load]);

  if (selected) return <MgrListDetail list={selected} reps={reps} onBack={() => { setSelected(null); load(); }} />;

  if (view === "notifications") return <AlertsView alerts={alerts} />;

  if (view === "reps") return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>Reps</h2>
      {loading ? <Loading /> : <MgrRepOverview reps={reps} lists={lists} />}
    </div>
  );

  // Lists view
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div><div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Lists</div><div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{lists.length} list{lists.length !== 1 ? "s" : ""} across your team</div></div>
        <Btn onClick={() => setShowUpload(true)} variant="success">+ Upload list</Btn>
      </div>
      <Err msg={error} onRetry={load} />
      {loading ? <Loading /> : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
              {["List name", "Provider", "Reps", "Progress", "Created", ""].map((h) => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 500, color: T.faint, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {lists.length === 0 && <tr><td colSpan={6}><Empty text="No lists — upload one to start" /></td></tr>}
              {lists.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer" }} onClick={() => setSelected(l)} onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf8")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 500, color: T.text, fontSize: 13 }}>{l.name}</div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{l.state || ""}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>{l.provider ? <Badge color={T.accent} bg={T.accentBg}>{l.provider}</Badge> : <span style={{ color: T.muted }}>—</span>}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {l.assignments?.length > 0 ? <div style={{ display: "flex" }}>{l.assignments.slice(0, 4).map((a, i) => <Avatar key={a.rep_id} name={a.profiles?.full_name} size={24} colors={repColors[i % repColors.length]} />)}{l.assignments.length > 4 && <span style={{ fontSize: 10, color: T.faint, marginLeft: 4, alignSelf: "center" }}>+{l.assignments.length - 4}</span>}</div> : <span style={{ color: T.muted, fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px" }}><Progress pct={0} /></td>
                  <td style={{ padding: "12px 14px", fontSize: 11, color: T.faint }}>{fmt(l.created_at)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
    </>
  );
}

// ─── REP: LIST VIEW ──────────────────────────────────────────────────────────
function RepListView({ list, assignment, onBack }) {
  const { session } = useApp();
  const t = session.token; const repId = session.user.id;
  const sp = assignment?.start_position || 1; const ep = assignment?.end_position || 999999;
  const [ws, setWs] = useState([]); const [prog, setProg] = useState({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [w, p] = await Promise.all([sb(`/rest/v1/websites?list_id=eq.${list.id}&position=gte.${sp}&position=lte.${ep}&order=position.asc&select=*`, { token: t }), sb(`/rest/v1/progress?rep_id=eq.${repId}&select=*`, { token: t })]);
      setWs(w || []); const m = {}; (p || []).forEach((x) => { m[x.website_id] = x; }); setProg(m);
    } catch (e) { setError(e.message); } setLoading(false);
  }, [list.id, sp, ep, repId, t]);
  useEffect(() => { load(); }, [load]);

  const upsert = async (wId, field, val) => {
    const ex = prog[wId];
    setProg((p) => ({ ...p, [wId]: { ...ex, [field]: val, website_id: wId, rep_id: repId } }));
    try {
      if (ex?.id) await sb(`/rest/v1/progress?id=eq.${ex.id}`, { method: "PATCH", token: t, body: { [field]: val, updated_at: new Date().toISOString() } });
      else { const r = await sb("/rest/v1/progress?select=*", { method: "POST", prefer: "return=representation", token: t, body: { website_id: wId, rep_id: repId, [field]: val } }); if (r?.[0]) setProg((p) => ({ ...p, [wId]: r[0] })); }
    } catch (e) { setProg((p) => ({ ...p, [wId]: ex })); setError(e.message); }
  };

  const visit = (w) => { window.open(w.url.startsWith("http") ? w.url : `https://${w.url}`, "_blank"); if (!prog[w.id]?.visited) upsert(w.id, "visited", true); };
  const vals = Object.values(prog).filter((p) => ws.some((w) => w.id === p.website_id));
  const stats = { total: ws.length, visited: vals.filter((p) => p.visited).length, claimed: vals.filter((p) => p.claimed).length, notOpen: vals.filter((p) => p.not_open).length };

  if (loading) return <Loading />;
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 12, marginBottom: 14, padding: 0, fontWeight: 500 }}>← Back</button>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.text }}>{list.name}</h2>
      <p style={{ color: T.faint, fontSize: 11, margin: "2px 0 14px" }}>Your websites: #{sp}–#{ep}</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <StatCard label="Assigned" value={stats.total} /><StatCard label="Visited" value={stats.visited} color={T.blue} /><StatCard label="Claimed" value={stats.claimed} color={T.green} /><StatCard label="Not open" value={stats.notOpen} color={T.red} />
      </div>
      <Err msg={error} />
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
            {["#", "Website", "Visited", "Claimed", "Not open", "Last updated"].map((h, i) => <th key={h} style={{ padding: "10px 14px", textAlign: i >= 2 && i <= 4 ? "center" : "left", fontSize: 10, fontWeight: 500, color: T.faint, textTransform: "uppercase" }}>{h}</th>)}
          </tr></thead>
          <tbody>{ws.map((w) => {
            const p = prog[w.id] || {};
            const lastUp = p.updated_at || p.created_at;
            return (
              <tr key={w.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                <td style={{ padding: "9px 14px", fontSize: 11, color: T.muted }}>{w.position}</td>
                <td style={{ padding: "9px 14px" }}><button onClick={() => visit(w)} style={{ background: "none", border: "none", color: T.blue, cursor: "pointer", fontSize: 12, padding: 0, textAlign: "left" }}>{w.url}</button></td>
                <td style={{ padding: "9px 14px", textAlign: "center" }}><Check checked={!!p.visited} color={T.blue} disabled /></td>
                <td style={{ padding: "9px 14px", textAlign: "center" }}><Check checked={!!p.claimed} color={T.green} onChange={() => upsert(w.id, "claimed", !p.claimed)} /></td>
                <td style={{ padding: "9px 14px", textAlign: "center" }}><Check checked={!!p.not_open} color={T.red} onChange={() => upsert(w.id, "not_open", !p.not_open)} /></td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: T.faint }}>{fmt(lastUp)}</td>
              </tr>);
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── REP APP ──────────────────────────────────────────────────────────────────
function RepApp() {
  const { session } = useApp();
  const [al, setAl] = useState([]); const [sel, setSel] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { sb(`/rest/v1/assignments?rep_id=eq.${session.user.id}&select=*,lists(*)`, { token: session.token }).then((d) => { setAl((d || []).filter((a) => a.lists)); setLoading(false); }).catch(() => setLoading(false)); }, [session.user.id, session.token]);

  if (sel) return <RepListView list={sel.lists} assignment={sel} onBack={() => setSel(null)} />;
  return (
    <>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>My lists</h2>
      {loading ? <Loading /> : al.length === 0 ? <Empty text="No lists assigned yet" /> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {al.map((a) => {
          const l = a.lists; const c = (a.end_position || 0) - (a.start_position || 0) + 1;
          return (
            <div key={`${a.list_id}_${a.rep_id}`} onClick={() => setSel(a)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = T.shadowMd; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4, color: T.text }}>{l.name}</div>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 10 }}>{c > 0 ? `${c} websites (#${a.start_position}–#${a.end_position})` : "All"}</div>
              <div style={{ display: "flex", gap: 4 }}>{l.provider && <Badge color={T.accent} bg={T.accentBg}>{l.provider}</Badge>}{l.state && <Badge color={T.dim} bg={T.bg}>{l.state}</Badge>}</div>
            </div>);
        })}
      </div>}
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [view, setView] = useState("lists");
  const logout = useCallback(() => setSession(null), []);
  if (!session) return <LoginScreen onLogin={setSession} />;
  const isManager = session.profile?.role === "manager";

  return (
    <AppCtx.Provider value={{ session, logout }}>
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: T.text }}>
        <Sidebar view={view} setView={setView} alerts={alerts} />
        <div style={{ flex: 1, background: T.bg, padding: "24px 28px", minWidth: 0, overflow: "auto" }}>
          {isManager ? <ManagerApp view={view} setAlerts={setAlerts} /> : <RepApp />}
        </div>
      </div>
    </AppCtx.Provider>
  );
}