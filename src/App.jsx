import { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";

const SB_URL = "https://xlddlwqfqldnqwdbuiie.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZGRsd3FmcWxkbnF3ZGJ1aWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTYxNDIsImV4cCI6MjA4OTMzMjE0Mn0.4NHR2nhet-StNgX94w55IFOJBITo3JGA6fUXYK1xJVo";

async function sb(path, { method = "GET", body, prefer, token } = {}) {
  const h = { "Content-Type": "application/json", apikey: SB_KEY };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (prefer) h["Prefer"] = prefer;
  const r = await fetch(`${SB_URL}${path}`, { method, headers: h, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (r.status === 204 || r.headers.get("content-length") === "0") return null;
  const txt = await r.text(); if (!txt) return null;
  let d; try { d = JSON.parse(txt); } catch { throw new Error("Invalid response"); }
  if (!r.ok) throw new Error(d?.message || d?.error_description || "Failed");
  return d;
}
async function loginAuth(e, p) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY }, body: JSON.stringify({ email: e, password: p }) });
  const d = await r.json(); if (!r.ok) throw new Error(d?.error_description || "Invalid credentials"); return d;
}
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);
function parseCSV(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onerror = () => rej(new Error("Read failed")); r.onload = (e) => { const l = e.target.result.split(/[\n\r,;]+/).map((x) => x.trim().replace(/^["']+|["']+$/g, "")).filter((x) => x && x.includes(".") && !/^(website|url|domain|http)/i.test(x)); res([...new Set(l)]); }; r.readAsText(file); }); }
const fmt = (d) => { if (!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
const repClr = [["#4f46e5","#e0e7ff"],["#d97706","#fef3c7"],["#db2777","#fce7f3"],["#059669","#d1fae5"],["#dc2626","#fee2e2"],["#7c3aed","#ede9fe"]];

// ─── THEME ────────────────────────────────────────────────────────────────────
const light = { bg: "#ffffff", bg2: "#fbfbfa", bg3: "#f5f5f4", border: "#e8e8e6", borderLight: "#f0f0ee", text: "#111", text2: "#666", text3: "#aaa", text4: "#ccc", accent: "#111", accentBg: "#f5f5f5", green: "#059669", greenBg: "#ecfdf5", blue: "#2563eb", blueBg: "#eff6ff", red: "#ef4444", redBg: "#fef2f2", amber: "#d97706", amberBg: "#fffbeb", sidebarBg: "#fbfbfa", sidebarHover: "rgba(0,0,0,0.04)", sidebarActive: "rgba(0,0,0,0.06)", sidebarText: "#111", sidebarDim: "#888", cardBg: "#fff", inputBg: "#fff", btnPrimary: "#111", btnPrimaryText: "#fff", shadow: "0 1px 3px rgba(0,0,0,0.04)" };
const dark = { bg: "#111113", bg2: "#19191b", bg3: "#222225", border: "#2c2c30", borderLight: "#232327", text: "#e8e8e6", text2: "#a0a0a0", text3: "#666", text4: "#444", accent: "#fff", accentBg: "#222225", green: "#34d399", greenBg: "#064e3b33", blue: "#60a5fa", blueBg: "#1e3a5f33", red: "#fb7185", redBg: "#4c000033", amber: "#fbbf24", amberBg: "#4c350033", sidebarBg: "#19191b", sidebarHover: "rgba(255,255,255,0.04)", sidebarActive: "rgba(255,255,255,0.07)", sidebarText: "#e8e8e6", sidebarDim: "#666", cardBg: "#19191b", inputBg: "#222225", btnPrimary: "#fff", btnPrimaryText: "#111", shadow: "0 1px 3px rgba(0,0,0,0.2)" };
const ThemeCtx = createContext(light);
const useTheme = () => useContext(ThemeCtx);

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = "primary", small, style: s }) {
  const t = useTheme();
  const base = { padding: small ? "5px 12px" : "9px 18px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 12 : 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap" };
  const v = { primary: { background: t.btnPrimary, color: t.btnPrimaryText }, success: { background: t.green, color: "#fff" }, ghost: { background: "transparent", border: `1px solid ${t.border}`, color: t.text2 }, danger: { background: t.redBg, border: `1px solid ${t.red}33`, color: t.red }, warning: { background: t.amberBg, border: `1px solid ${t.amber}33`, color: t.amber } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...s }}>{children}</button>;
}
function Badge({ children, color, bg }) { const t = useTheme(); return <span style={{ background: bg || t.accentBg, color: color || t.text2, padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>; }
function Avatar({ name, idx = 0, size = 28 }) { const c = repClr[idx % repClr.length]; const ini = (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2); return <div style={{ width: size, height: size, borderRadius: "50%", background: c[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "#fff", fontWeight: 600, flexShrink: 0, border: `2px solid ${useTheme().bg}` }}>{ini}</div>; }
function Check({ checked, onChange, color, disabled }) { const t = useTheme(); const c = color || t.blue; return <div onClick={disabled ? undefined : onChange} style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${checked ? c : t.text4}`, background: checked ? c : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>{checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}</div>; }
function Spinner({ size = 16 }) { const t = useTheme(); return <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><circle cx="12" cy="12" r="10" fill="none" stroke={t.text3} strokeWidth="3" strokeDasharray="32 32" strokeLinecap="round" /></svg>; }
function Loading() { const t = useTheme(); return <div style={{ padding: 60, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: t.text3, fontSize: 14 }}><Spinner /> Loading...</div>; }
function Empty({ icon = "📭", text }) { const t = useTheme(); return <div style={{ padding: 60, textAlign: "center", color: t.text3, fontSize: 14 }}><div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>{text}</div>; }
function Err({ msg, onRetry }) { const t = useTheme(); if (!msg) return null; return <div style={{ background: t.redBg, border: `1px solid ${t.red}33`, borderRadius: 8, padding: "10px 14px", color: t.red, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ flex: 1 }}>{msg}</span>{onRetry && <Btn onClick={onRetry} variant="ghost" small>Retry</Btn>}</div>; }
function Progress({ pct = 0 }) { const t = useTheme(); return <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><div style={{ background: t.bg3, borderRadius: 20, height: 7, width: 80 }}><div style={{ background: t.accent, borderRadius: 20, height: 7, width: `${Math.min(100, pct)}%`, transition: "width 0.3s" }} /></div><span style={{ fontSize: 13, color: pct > 0 ? t.text2 : t.text4, fontWeight: 500, minWidth: 30 }}>{Math.round(pct)}%</span></div>; }
function StatCard({ label, value, color }) { const t = useTheme(); return <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 0", minWidth: 80 }}><div style={{ fontSize: 12, color: t.text3, marginBottom: 4 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 700, color: color || t.text, letterSpacing: "-0.02em" }}>{value}</div></div>; }

function ThemeToggle({ isDark, toggle }) {
  const t = useTheme();
  return (
    <button onClick={toggle} style={{ background: t.sidebarHover, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: t.sidebarDim, fontSize: 12, width: "100%" }}>
      {isDark ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function Modal({ children, onClose, width = 460 }) {
  const t = useTheme();
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}><div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28, width, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>{children}</div></div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const go = async () => { if (!email || !pw) return setErr("Enter email and password"); setLoading(true); setErr(""); try { const a = await loginAuth(email, pw); const p = await sb(`/rest/v1/profiles?id=eq.${a.user.id}&select=*`, { token: a.access_token }); if (!p?.[0]) throw new Error("Profile not found"); onLogin({ token: a.access_token, user: a.user, profile: p[0] }); } catch (e) { setErr(e.message); } setLoading(false); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)", position: "relative", overflow: "hidden" }}>
      {/* Decorative circles — soft colors */}
      <div style={{ position: "absolute", top: -120, right: -60, width: 450, height: 450, borderRadius: "50%", background: "rgba(139,92,246,0.1)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -40, width: 350, height: 350, borderRadius: "50%", background: "rgba(56,189,248,0.08)" }} />
      <div style={{ position: "absolute", top: "55%", left: "30%", width: 200, height: 200, borderRadius: "50%", background: "rgba(251,146,60,0.06)" }} />
      <div style={{ position: "absolute", top: "15%", left: "50%", width: 120, height: 120, borderRadius: "50%", background: "rgba(52,211,153,0.07)" }} />

      {/* Left — branding */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 40px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 38, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Auto Dealers Digital</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 17, margin: "0 0 52px", lineHeight: 1.5 }}>Prospecting workspace</p>

          <div style={{ display: "flex", gap: 16 }}>
            {[
              ["⚡", "Fast", "Find and track prospects at scale"],
              ["🎯", "Focused", "Every rep sees only what matters to them"],
              ["📈", "Measured", "Real-time progress across your whole team"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 28, color: "rgba(255,255,255,0.15)", fontSize: 12 }}>© 2025 Auto Dealers Digital</div>
      </div>

      {/* Right — sign-in card */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 40px 40px 0", position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ width: 340, background: "rgba(248,250,252,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 20, padding: "40px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h2 style={{ color: "#111", fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Welcome back</h2>
          <p style={{ color: "#999", fontSize: 14, margin: "0 0 28px" }}>Sign in to your account</p>

          <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 5 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="you@company.com" type="email" style={{ width: "100%", padding: "11px 14px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

          <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 5 }}>Password</label>
          <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="••••••••" type="password" style={{ width: "100%", padding: "11px 14px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 22 }} />

          {err && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{err}</div>}

          <button onClick={go} disabled={loading} style={{ width: "100%", padding: 12, background: "#1e293b", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading && <Spinner />} {loading ? "Signing in..." : "Sign in →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, alerts, isDark, toggleTheme }) {
  const { session, logout } = useApp();
  const t = useTheme();
  const p = session.profile;
  const isM = p.role === "manager";
  const ini = (p.full_name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const ac = (alerts || []).length;
  const items = isM ? [["lists", "📋", "Lists"], ["reps", "👤", "Reps"], ["alerts", "🔔", "Alerts"]] : [["lists", "📋", "My Lists"]];

  return (
    <div style={{ width: 230, background: t.sidebarBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "20px 18px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill={t.btnPrimaryText}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
        <span style={{ fontSize: 16, fontWeight: 700, color: t.sidebarText, letterSpacing: "-0.02em" }}>Prospecting</span>
      </div>
      <div style={{ padding: "0 10px 0", fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 18 }}>Workspace</div>
      <div style={{ padding: "0 10px", flex: 1 }}>
        {items.map(([id, icon, label]) => (
          <div key={id} onClick={() => setView(id)} style={{ padding: "8px 12px", borderRadius: 7, background: view === id ? t.sidebarActive : "transparent", color: view === id ? t.sidebarText : t.sidebarDim, fontSize: 15, fontWeight: view === id ? 500 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 2, transition: "all 0.1s" }}>
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
            {label}
            {id === "alerts" && ac > 0 && <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: 10, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, padding: "0 5px" }}>{ac}</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${t.border}` }}>
        <ThemeToggle isDark={isDark} toggle={toggleTheme} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: t.btnPrimaryText, fontWeight: 600 }}>{ini}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.sidebarText, fontSize: 13, fontWeight: 500 }}>{p.full_name}</div>
            <div style={{ color: t.text3, fontSize: 11, textTransform: "capitalize" }}>{p.role}</div>
          </div>
        </div>
        <button onClick={logout} style={{ width: "100%", marginTop: 10, padding: "6px 0", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, color: t.text3, cursor: "pointer", fontSize: 12 }}>Sign out</button>
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function UploadModal({ onClose, onDone }) {
  const { session } = useApp(); const t = useTheme();
  const [name, setName] = useState(""); const [provider, setProvider] = useState(""); const [state, setState] = useState("");
  const [urls, setUrls] = useState([]); const [fn, setFn] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const hf = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setFn(f.name); const p = await parseCSV(f); setUrls(p); setError(p.length === 0 ? "No URLs found" : ""); } catch { setError("Read failed"); } };
  const go = async () => { if (!name.trim()) return setError("Name required"); if (!urls.length) return setError("Upload CSV"); setLoading(true); setError(""); try { const l = await sb("/rest/v1/lists?select=*", { method: "POST", prefer: "return=representation", token: session.token, body: { name: name.trim(), provider: provider.trim() || null, state: state.trim() || null } }); if (!l?.[0]?.id) throw new Error("Failed"); const rows = urls.map((u, i) => ({ list_id: l[0].id, url: u, position: i + 1 })); for (let i = 0; i < rows.length; i += 100) await sb("/rest/v1/websites", { method: "POST", token: session.token, body: rows.slice(i, i + 100) }); onDone(); } catch (e) { setError(e.message); } setLoading(false); };
  const is = { width: "100%", padding: "10px 14px", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" };
  return <Modal onClose={onClose}><h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: t.text }}>Upload new list</h2>
    {[{ l: "List name", v: name, s: setName, p: "e.g. Florida Dentists Q1" }, { l: "Provider", v: provider, s: setProvider, p: "Optional" }, { l: "State", v: state, s: setState, p: "Optional" }].map((f) => <div key={f.l} style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: t.text2, marginBottom: 5 }}>{f.l}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p} style={is} /></div>)}
    <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, color: t.text2, marginBottom: 5 }}>CSV file</label><label style={{ display: "block", padding: 22, background: t.bg3, border: `2px dashed ${t.border}`, borderRadius: 10, textAlign: "center", cursor: "pointer" }}><input type="file" accept=".csv,.txt" onChange={hf} style={{ display: "none" }} /><div style={{ color: t.text3, fontSize: 14 }}>{fn || "Click to select CSV"}</div>{urls.length > 0 && <div style={{ color: t.green, fontSize: 13, marginTop: 6, fontWeight: 600 }}>✓ {urls.length} websites</div>}</label></div>
    <Err msg={error} /><div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={loading}>{loading ? "Uploading..." : "Upload"}</Btn></div></Modal>;
}

function AssignModal({ list, reps, assignments, wc, token, onClose, onDone }) {
  const t = useTheme();
  const existing = useMemo(() => assignments.map((a) => ({ rep_id: a.rep_id, name: a.profiles?.full_name || "?", start: a.start_position || 1, end: a.end_position || wc })), [assignments, wc]);
  const [slots, setSlots] = useState(() => existing.length > 0 ? existing : []);
  const [sel, setSel] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const used = useMemo(() => new Set(slots.map((s) => s.rep_id)), [slots]);
  const avail = useMemo(() => reps.filter((r) => !used.has(r.id)), [reps, used]);
  const total = slots.reduce((s, x) => s + Math.max(0, (x.end || 0) - (x.start || 0) + 1), 0);
  const gc = (s) => Math.max(0, (s.end || 0) - (s.start || 0) + 1);
  const addRep = () => { if (!sel) return; const r = reps.find((x) => x.id === sel); if (r) setSlots((p) => [...p, { rep_id: r.id, name: r.full_name, start: 0, end: 0 }]); setSel(""); };
  const rmSlot = (i) => { setSlots((p) => { const n = p.filter((_, j) => j !== i); let pos = 1; return n.map((s) => { const c = gc(s); const st = pos; pos += c; return { ...s, start: st, end: st + c - 1 }; }); }); };
  const setCount = (idx, v) => { const count = Math.max(0, parseInt(v) || 0); setSlots((prev) => { const n = [...prev]; const rem = wc - count; const oth = n.filter((_, i) => i !== idx); if (oth.length > 0 && rem >= 0) { const per = Math.floor(rem / oth.length); const r = rem % oth.length; let oi = 0; for (let i = 0; i < n.length; i++) { if (i === idx) continue; n[i] = { ...n[i], _c: per + (oi < r ? 1 : 0) }; oi++; } } let pos = 1; for (let i = 0; i < n.length; i++) { const c = i === idx ? count : (n[i]._c ?? gc(n[i])); n[i] = { ...n[i], start: pos, end: pos + Math.max(0, c) - 1 }; pos += Math.max(0, c); delete n[i]._c; } return n; }); };
  const dist = () => { if (!slots.length) return; const p = Math.floor(wc / slots.length); const r = wc % slots.length; let pos = 1; setSlots((s) => s.map((x, i) => { const c = p + (i < r ? 1 : 0); const st = pos; pos += c; return { ...x, start: st, end: st + c - 1 }; })); };
  const validate = () => { for (const s of slots) { if (s.start < 1 || s.end < 1 || s.start > s.end) return "Invalid range"; if (s.end > wc) return `Exceeds ${wc}`; } const sr = [...slots].sort((a, b) => a.start - b.start); for (let i = 1; i < sr.length; i++) if (sr[i].start <= sr[i - 1].end) return "Overlap"; return null; };
  const go = async () => { if (!slots.length) return setError("Add a rep"); const e = validate(); if (e) return setError(e); setLoading(true); setError(""); try { await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token }); for (const s of slots) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: s.rep_id, start_position: s.start, end_position: s.end } }); onDone(); } catch (e) { setError(e.message); } setLoading(false); };
  const is = { padding: "7px 10px", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 13, textAlign: "center", outline: "none", width: 65 };
  return <Modal onClose={onClose} width={540}><h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: t.text }}>Assign reps</h2><p style={{ color: t.text3, fontSize: 13, margin: "0 0 16px" }}>{list.name} · {wc} websites</p>
    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}><StatCard label="Total" value={wc} /><StatCard label="Assigned" value={total} color={t.green} /><StatCard label="Open" value={Math.max(0, wc - total)} color={wc - total > 0 ? t.red : t.text4} /></div>
    {slots.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 11, color: t.text3, textTransform: "uppercase" }}><div style={{ flex: 1 }}>Rep</div><div style={{ width: 65, textAlign: "center" }}>Count</div><div style={{ width: 55, textAlign: "center" }}>From</div><div style={{ width: 55, textAlign: "center" }}>To</div><div style={{ width: 24 }} /></div>
      {slots.map((s, i) => <div key={s.rep_id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${t.borderLight}` }}><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}><Avatar name={s.name} idx={i} size={24} /><span style={{ fontWeight: 500, fontSize: 14, color: t.text }}>{s.name}</span></div><input value={gc(s) || ""} onChange={(e) => setCount(i, e.target.value)} style={is} placeholder="0" /><input value={s.start || ""} readOnly style={{ ...is, background: t.bg3, color: t.text3 }} /><input value={s.end || ""} readOnly style={{ ...is, background: t.bg3, color: t.text3 }} /><button onClick={() => rmSlot(i)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: t.redBg, color: t.red, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>)}
    </div>}
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>{avail.length > 0 && <><select value={sel} onChange={(e) => setSel(e.target.value)} style={{ padding: "7px 12px", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 13 }}><option value="">Add rep...</option>{avail.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select><Btn onClick={addRep} disabled={!sel} small>+ Add</Btn></>}{slots.length > 0 && <Btn onClick={dist} variant="ghost" small>Distribute evenly</Btn>}</div>
    <Err msg={error} /><div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${t.border}`, paddingTop: 14 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={loading}>{loading ? "Saving..." : "Save"}</Btn></div></Modal>;
}

function ReassignModal({ list, reps, assignments, websites, progress, token, onClose, onDone }) {
  const t = useTheme();
  const [fromRep, setFromRep] = useState(""); const [toRep, setToRep] = useState(""); const [mode, setMode] = useState("unvisited"); const [selPos, setSelPos] = useState(new Set()); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const fromA = assignments.find((a) => a.rep_id === fromRep); const toA = assignments.find((a) => a.rep_id === toRep);
  const fromWs = useMemo(() => fromA ? websites.filter((w) => w.position >= (fromA.start_position || 1) && w.position <= (fromA.end_position || 999999)) : [], [fromA, websites]);
  const unvis = useMemo(() => fromWs.filter((w) => !progress.find((p) => p.website_id === w.id && p.rep_id === fromRep)?.visited), [fromWs, progress, fromRep]);
  const moving = mode === "all" ? fromWs : mode === "unvisited" ? unvis : fromWs.filter((w) => selPos.has(w.position));
  const mc = moving.length; const toOpts = reps.filter((r) => r.id !== fromRep);
  const go = async () => { if (!fromRep || !toRep) return setError("Select both"); if (fromRep === toRep) return setError("Same rep"); if (!mc) return setError("Nothing to move"); setLoading(true); setError(""); try { const mp = moving.map((w) => w.position).sort((a, b) => a - b); const rem = fromWs.filter((w) => !mp.includes(w.position)).map((w) => w.position).sort((a, b) => a - b); let ntp; if (toA) { const tp = websites.filter((w) => w.position >= (toA.start_position || 0) && w.position <= (toA.end_position || 0)).map((w) => w.position); ntp = [...tp, ...mp].sort((a, b) => a - b); } else ntp = [...mp].sort((a, b) => a - b); await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${fromRep}`, { method: "DELETE", token }); if (toA) await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${toRep}`, { method: "DELETE", token }); if (rem.length) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: fromRep, start_position: Math.min(...rem), end_position: Math.max(...rem) } }); if (ntp.length) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: toRep, start_position: Math.min(...ntp), end_position: Math.max(...ntp) } }); onDone(); } catch (e) { setError(e.message); } setLoading(false); };
  const is = { width: "100%", padding: "10px 14px", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" };
  return <Modal onClose={onClose} width={540}><h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: t.text }}>Reassign websites</h2><p style={{ color: t.text3, fontSize: 13, margin: "0 0 16px" }}>Move websites between reps</p>
    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}><div style={{ flex: 1 }}><label style={{ fontSize: 13, color: t.text2, marginBottom: 5, display: "block" }}>From</label><select value={fromRep} onChange={(e) => { setFromRep(e.target.value); setSelPos(new Set()); setToRep(""); }} style={is}><option value="">Select...</option>{assignments.map((a) => <option key={a.rep_id} value={a.rep_id}>{a.profiles?.full_name} (#{a.start_position}–#{a.end_position})</option>)}</select></div><div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8, fontSize: 18, color: t.text4 }}>→</div><div style={{ flex: 1 }}><label style={{ fontSize: 13, color: t.text2, marginBottom: 5, display: "block" }}>To</label><select value={toRep} onChange={(e) => setToRep(e.target.value)} style={is}><option value="">Select...</option>{toOpts.map((r) => { const a = assignments.find((a) => a.rep_id === r.id); return <option key={r.id} value={r.id}>{r.full_name}{a ? ` (#${a.start_position}–#${a.end_position})` : " (new)"}</option>; })}</select></div></div>
    {fromRep && <><div style={{ marginBottom: 14 }}><div style={{ fontSize: 13, color: t.text2, marginBottom: 8 }}>What to move</div><div style={{ display: "flex", gap: 6 }}>{[["unvisited", `Unvisited (${unvis.length})`], ["all", `All (${fromWs.length})`], ["selected", "Manual"]].map(([v, l]) => <button key={v} onClick={() => setMode(v)} style={{ padding: "6px 16px", borderRadius: 7, border: `1px solid ${mode === v ? t.accent : t.border}`, background: mode === v ? t.accentBg : "transparent", color: mode === v ? t.text : t.text3, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>{l}</button>)}</div></div>
      {mode === "selected" && <div style={{ maxHeight: 180, overflow: "auto", border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 14 }}>{fromWs.map((w) => { const vis = progress.find((p) => p.website_id === w.id && p.rep_id === fromRep)?.visited; return <div key={w.id} onClick={() => setSelPos((p) => { const n = new Set(p); n.has(w.position) ? n.delete(w.position) : n.add(w.position); return n; })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderBottom: `1px solid ${t.borderLight}`, cursor: "pointer", background: selPos.has(w.position) ? t.blueBg : "transparent" }}><Check checked={selPos.has(w.position)} /><span style={{ fontSize: 12, color: t.text3, width: 30 }}>#{w.position}</span><span style={{ fontSize: 13, color: t.text, flex: 1 }}>{w.url}</span>{vis && <Badge color={t.blue} bg={t.blueBg}>Visited</Badge>}</div>; })}</div>}
      {mc > 0 && <div style={{ background: t.amberBg, border: `1px solid ${t.amber}33`, borderRadius: 8, padding: "9px 14px", fontSize: 13, color: t.amber, marginBottom: 14 }}>{mc} website{mc !== 1 ? "s" : ""} will be moved{toRep ? ` to ${reps.find((r) => r.id === toRep)?.full_name}` : ""}</div>}</>}
    <Err msg={error} /><div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${t.border}`, paddingTop: 14 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={loading || !fromRep || !toRep || !mc} variant="warning">{loading ? "Moving..." : `Move ${mc}`}</Btn></div></Modal>;
}

function EditListModal({ list, token, onClose, onDone }) {
  const t = useTheme();
  const [name, setName] = useState(list.name || ""); const [prov, setProv] = useState(list.provider || ""); const [state, setState] = useState(list.state || "");
  const [urls, setUrls] = useState([]); const [fn, setFn] = useState(""); const [repl, setRepl] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const hf = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setFn(f.name); const p = await parseCSV(f); setUrls(p); } catch { setError("Read failed"); } };
  const go = async () => { if (!name.trim()) return setError("Name required"); setLoading(true); setError(""); try { await sb(`/rest/v1/lists?id=eq.${list.id}`, { method: "PATCH", token, body: { name: name.trim(), provider: prov.trim() || null, state: state.trim() || null } }); if (repl && urls.length) { await sb(`/rest/v1/websites?list_id=eq.${list.id}`, { method: "DELETE", token }); await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token }); const rows = urls.map((u, i) => ({ list_id: list.id, url: u, position: i + 1 })); for (let i = 0; i < rows.length; i += 100) await sb("/rest/v1/websites", { method: "POST", token, body: rows.slice(i, i + 100) }); } onDone(); } catch (e) { setError(e.message); } setLoading(false); };
  const is = { width: "100%", padding: "10px 14px", background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" };
  return <Modal onClose={onClose}><h2 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: t.text }}>Edit list</h2>
    {[{ l: "Name", v: name, s: setName }, { l: "Provider", v: prov, s: setProv }, { l: "State", v: state, s: setState }].map((f) => <div key={f.l} style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: t.text2, marginBottom: 5 }}>{f.l}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} style={is} /></div>)}
    {!repl ? <div style={{ marginBottom: 16 }}><Btn onClick={() => setRepl(true)} variant="danger" small>Replace CSV</Btn><p style={{ fontSize: 12, color: t.text3, marginTop: 4 }}>Deletes all websites & assignments</p></div> : <div style={{ marginBottom: 16 }}><label style={{ display: "block", padding: 20, background: t.redBg, border: `2px dashed ${t.red}33`, borderRadius: 10, textAlign: "center", cursor: "pointer" }}><input type="file" accept=".csv,.txt" onChange={hf} style={{ display: "none" }} /><div style={{ color: t.red, fontSize: 14 }}>{fn || "Select new CSV"}</div>{urls.length > 0 && <div style={{ color: t.green, fontSize: 13, marginTop: 4 }}>✓ {urls.length} found</div>}</label><button onClick={() => { setRepl(false); setUrls([]); }} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 12, marginTop: 4 }}>Cancel</button></div>}
    <Err msg={error} /><div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={loading}>{loading ? "Saving..." : "Save"}</Btn></div></Modal>;
}

// ─── MANAGER: LIST DETAIL ─────────────────────────────────────────────────────
function MgrListDetail({ list, reps, onBack }) {
  const { session } = useApp(); const t = useTheme(); const tk = session.token;
  const [ws, setWs] = useState([]); const [prog, setProg] = useState([]); const [asgn, setAsgn] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [showAssign, setShowAssign] = useState(false); const [showReassign, setShowReassign] = useState(false); const [showEdit, setShowEdit] = useState(false);
  const [cur, setCur] = useState(list);

  const load = useCallback(async () => { setLoading(true); setError(""); try { const [ls, w, p, a] = await Promise.all([sb(`/rest/v1/lists?id=eq.${cur.id}&select=*`, { token: tk }), sb(`/rest/v1/websites?list_id=eq.${cur.id}&order=position.asc&select=*`, { token: tk }), sb(`/rest/v1/progress?select=*`, { token: tk }), sb(`/rest/v1/assignments?list_id=eq.${cur.id}&select=*,profiles(full_name,id)`, { token: tk })]); if (ls?.[0]) setCur(ls[0]); setWs(w || []); setProg(p || []); setAsgn(a || []); } catch (e) { setError(e.message); } setLoading(false); }, [cur.id, tk]);
  useEffect(() => { load(); }, [load]);

  const rs = useCallback((a) => { const rw = ws.filter((w) => w.position >= (a.start_position || 1) && w.position <= (a.end_position || ws.length)); const ids = new Set(rw.map((w) => w.id)); const rp = prog.filter((p) => p.rep_id === a.rep_id && ids.has(p.website_id)); return { total: rw.length, visited: rp.filter((p) => p.visited).length, claimed: rp.filter((p) => p.claimed).length, notOpen: rp.filter((p) => p.not_open).length }; }, [prog, ws]);

  if (loading) return <Loading />;
  return <div>
    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>← Back</button>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: "-0.02em" }}>{cur.name}</h2>{cur.provider && <Badge>{cur.provider}</Badge>}{cur.state && <Badge>{cur.state}</Badge>}<Btn onClick={() => setShowEdit(true)} variant="ghost" small>Edit</Btn></div>
    <p style={{ color: t.text3, fontSize: 13, margin: "0 0 20px" }}>{ws.length} websites</p>
    <Err msg={error} onRetry={load} />
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Team</span>
        <div style={{ display: "flex", gap: 6 }}>{asgn.length >= 1 && <Btn onClick={() => setShowReassign(true)} variant="warning" small>↔ Reassign</Btn>}<Btn onClick={() => setShowAssign(true)} small>{asgn.length > 0 ? "Edit" : "Assign"}</Btn></div>
      </div>
      {asgn.length === 0 ? <span style={{ color: t.text3, fontSize: 14 }}>No reps assigned</span> :
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{asgn.map((a, i) => { const s = rs(a); const pct = s.total > 0 ? (s.visited / s.total) * 100 : 0; return <div key={a.rep_id} style={{ background: t.greenBg, border: `1px solid ${t.green}22`, borderRadius: 10, padding: "14px 18px", minWidth: 180 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Avatar name={a.profiles?.full_name} idx={i} size={28} /><span style={{ fontWeight: 600, color: t.green, fontSize: 14 }}>{a.profiles?.full_name}</span></div><div style={{ fontSize: 12, color: t.text2, marginBottom: 8 }}>#{a.start_position || 1}–#{a.end_position || ws.length} ({s.total} sites)</div><Progress pct={pct} /><div style={{ display: "flex", gap: 12, fontSize: 12, color: t.text3, marginTop: 8 }}><span>👁 {s.visited}</span><span>✅ {s.claimed}</span><span>🚫 {s.notOpen}</span></div></div>; })}</div>}
    </div>
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
        <thead><tr style={{ borderBottom: `1px solid ${t.borderLight}` }}>{["#", "Website", "Assigned to", "Last activity", ...asgn.map((a) => a.profiles?.full_name)].map((h, i) => <th key={i} style={{ padding: "12px 16px", textAlign: i > 2 ? "center" : "left", fontSize: 12, fontWeight: 400, color: t.text3 }}>{h}</th>)}</tr></thead>
        <tbody>{ws.length === 0 && <tr><td colSpan={4 + asgn.length}><Empty text="No websites" /></td></tr>}
          {ws.map((w) => { const as = asgn.find((a) => w.position >= (a.start_position || 1) && w.position <= (a.end_position || ws.length)); const wp = prog.filter((p) => p.website_id === w.id); const la = wp.reduce((l, p) => { const d = p.updated_at; return d && (!l || new Date(d) > new Date(l)) ? d : l; }, null); return <tr key={w.id} style={{ borderBottom: `1px solid ${t.borderLight}` }}><td style={{ padding: "10px 16px", fontSize: 12, color: t.text4 }}>{w.position}</td><td style={{ padding: "10px 16px" }}><a href={w.url.startsWith("http") ? w.url : `https://${w.url}`} target="_blank" rel="noreferrer" style={{ color: t.blue, fontSize: 14, textDecoration: "none" }}>{w.url}</a></td><td style={{ padding: "10px 16px" }}>{as ? <Badge color={t.green} bg={t.greenBg}>{as.profiles?.full_name}</Badge> : <span style={{ color: t.text4 }}>—</span>}</td><td style={{ padding: "10px 16px", fontSize: 12, color: t.text3 }}>{fmt(la)}</td>{asgn.map((a) => { if (w.position < (a.start_position || 1) || w.position > (a.end_position || ws.length)) return <td key={a.rep_id} style={{ padding: "10px 16px", textAlign: "center", color: t.borderLight }}>—</td>; const p = prog.find((p) => p.website_id === w.id && p.rep_id === a.rep_id); return <td key={a.rep_id} style={{ padding: "10px 16px", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", gap: 8, fontSize: 14 }}><span>{p?.visited ? "👁" : "·"}</span><span>{p?.claimed ? "✅" : "·"}</span><span>{p?.not_open ? "🚫" : "·"}</span></div></td>; })}</tr>; })}</tbody>
      </table>
    </div>
    {showAssign && <AssignModal list={cur} reps={reps} assignments={asgn} wc={ws.length} token={tk} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); load(); }} />}
    {showReassign && <ReassignModal list={cur} reps={reps} assignments={asgn} websites={ws} progress={prog} token={tk} onClose={() => setShowReassign(false)} onDone={() => { setShowReassign(false); load(); }} />}
    {showEdit && <EditListModal list={cur} token={tk} onClose={() => setShowEdit(false)} onDone={() => { setShowEdit(false); load(); }} />}
  </div>;
}

// ─── MANAGER VIEWS ────────────────────────────────────────────────────────────
function AlertsView({ alerts }) { const t = useTheme(); const da = (d) => Math.floor((new Date() - new Date(d)) / 86400000); return <div><h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: t.text, letterSpacing: "-0.02em" }}>Alerts</h2><p style={{ fontSize: 14, color: t.text3, marginBottom: 20 }}>Reps with no activity after 7+ days</p>{alerts.length === 0 ? <Empty icon="🔔" text="No alerts — all reps are active" /> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{alerts.map((a) => <div key={a.id} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 20px", display: "flex", gap: 14, alignItems: "center" }}><span style={{ fontSize: 22 }}>⚠️</span><div style={{ flex: 1 }}><div style={{ fontSize: 15, color: t.text }}><span style={{ fontWeight: 600 }}>{a.repName}</span> hasn't opened any website from <span style={{ fontWeight: 600 }}>{a.listName}</span></div><div style={{ fontSize: 12, color: t.text3, marginTop: 3 }}>Assigned {da(a.assignedAt)} days ago</div></div></div>)}</div>}</div>; }

function RepOverview({ reps, lists }) { const { session } = useApp(); const t = useTheme(); const [prog, setProg] = useState([]); const [ld, setLd] = useState(true); useEffect(() => { sb("/rest/v1/progress?select=*", { token: session.token }).then((d) => { setProg(d || []); setLd(false); }).catch(() => setLd(false)); }, [session.token]); if (ld) return <Loading />; return <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ borderBottom: `1px solid ${t.borderLight}` }}>{["Rep", "Lists", "Visited", "Claimed", "Not open", "Last active"].map((h) => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 400, color: t.text3 }}>{h}</th>)}</tr></thead><tbody>{reps.map((r, i) => { const rp = prog.filter((p) => p.rep_id === r.id); const la = rp.reduce((l, p) => { const d = p.updated_at; return d && (!l || new Date(d) > new Date(l)) ? d : l; }, null); return <tr key={r.id} style={{ borderBottom: `1px solid ${t.borderLight}` }}><td style={{ padding: "12px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={r.full_name} idx={i} size={30} /><span style={{ fontWeight: 500, fontSize: 15, color: t.text }}>{r.full_name}</span></div></td><td style={{ padding: "12px 16px", color: t.text2, fontSize: 14 }}>{lists.filter((l) => l.assignments?.some((a) => a.rep_id === r.id)).length}</td><td style={{ padding: "12px 16px" }}><Badge color={t.blue} bg={t.blueBg}>{rp.filter((p) => p.visited).length}</Badge></td><td style={{ padding: "12px 16px" }}><Badge color={t.green} bg={t.greenBg}>{rp.filter((p) => p.claimed).length}</Badge></td><td style={{ padding: "12px 16px" }}><Badge color={t.red} bg={t.redBg}>{rp.filter((p) => p.not_open).length}</Badge></td><td style={{ padding: "12px 16px", fontSize: 13, color: t.text3 }}>{fmt(la)}</td></tr>; })}</tbody></table></div>; }

// ─── MANAGER APP ──────────────────────────────────────────────────────────────
function ManagerApp({ view, setView, setAlerts }) {
  const { session } = useApp(); const t = useTheme(); const tk = session.token;
  const [lists, setLists] = useState([]); const [reps, setReps] = useState([]);
  const [sel, setSel] = useState(null); const [showUp, setShowUp] = useState(false);
  const [ld, setLd] = useState(true); const [err, setErr] = useState(""); const [alerts, setLA] = useState([]);

  const load = useCallback(async () => { setLd(true); setErr(""); try { const [ls, rs, pr] = await Promise.all([sb("/rest/v1/lists?select=*,assignments(rep_id,start_position,end_position,created_at,profiles(full_name))&order=created_at.desc", { token: tk }), sb("/rest/v1/profiles?role=eq.rep&select=*&order=full_name.asc", { token: tk }), sb("/rest/v1/progress?select=*", { token: tk })]); setLists(ls || []); setReps(rs || []); const now = new Date(); const al = []; for (const l of (ls || [])) { if (!l.assignments) continue; for (const a of l.assignments) { if (!a.created_at || Math.floor((now - new Date(a.created_at)) / 86400000) < 7) continue; if (!(pr || []).some((p) => p.rep_id === a.rep_id && p.visited)) al.push({ id: `${l.id}_${a.rep_id}`, listName: l.name, repName: a.profiles?.full_name || "?", assignedAt: a.created_at }); } } setLA(al); setAlerts(al); } catch (e) { setErr(e.message); } setLd(false); }, [tk, setAlerts]);
  useEffect(() => { load(); }, [load]);

  // Navigation fix: clicking sidebar while in detail view
  useEffect(() => { if (sel && (view === "reps" || view === "alerts")) setSel(null); }, [view, sel]);

  if (sel && view === "lists") return <MgrListDetail list={sel} reps={reps} onBack={() => { setSel(null); load(); }} />;
  if (view === "alerts") return <AlertsView alerts={alerts} />;
  if (view === "reps") return <div><h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: t.text, letterSpacing: "-0.02em" }}>Reps</h2>{ld ? <Loading /> : <RepOverview reps={reps} lists={lists} />}</div>;

  return <>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}><div><div style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: "-0.03em" }}>Lists</div><div style={{ fontSize: 14, color: t.text3, marginTop: 3 }}>Manage your prospecting lists</div></div><Btn onClick={() => setShowUp(true)}>+ New list</Btn></div>
    <Err msg={err} onRetry={load} />
    {ld ? <Loading /> : <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: `1px solid ${t.borderLight}` }}>{["Name", "Provider", "Team", "Progress", "Created", ""].map((h) => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 400, color: t.text3 }}>{h}</th>)}</tr></thead>
        <tbody>{lists.length === 0 && <tr><td colSpan={6}><Empty text="No lists — upload one to start" /></td></tr>}
          {lists.map((l) => <tr key={l.id} style={{ borderBottom: `1px solid ${t.borderLight}`, cursor: "pointer" }} onClick={() => { setSel(l); setView("lists"); }} onMouseEnter={(e) => (e.currentTarget.style.background = t.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <td style={{ padding: "14px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 20 }}>📋</span><div><div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{l.name}</div>{l.state && <div style={{ fontSize: 12, color: t.text3 }}>{l.state}</div>}</div></div></td>
            <td style={{ padding: "14px 16px" }}>{l.provider ? <Badge>{l.provider}</Badge> : <span style={{ color: t.text4 }}>—</span>}</td>
            <td style={{ padding: "14px 16px" }}>{l.assignments?.length > 0 ? <div style={{ display: "flex" }}>{l.assignments.slice(0, 5).map((a, i) => <Avatar key={a.rep_id} name={a.profiles?.full_name} idx={i} size={28} />)}{l.assignments.length > 5 && <span style={{ fontSize: 12, color: t.text3, alignSelf: "center", marginLeft: 4 }}>+{l.assignments.length - 5}</span>}</div> : <span style={{ color: t.text4, fontSize: 13 }}>—</span>}</td>
            <td style={{ padding: "14px 16px" }}><Progress pct={0} /></td>
            <td style={{ padding: "14px 16px", fontSize: 13, color: t.text3 }}>{fmt(l.created_at)}</td>
            <td style={{ padding: "14px 16px", textAlign: "right" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.text4} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></td>
          </tr>)}</tbody>
      </table>
    </div>}
    {showUp && <UploadModal onClose={() => setShowUp(false)} onDone={() => { setShowUp(false); load(); }} />}
  </>;
}

// ─── REP LIST VIEW ────────────────────────────────────────────────────────────
function RepListView({ list, assignment, onBack }) {
  const { session } = useApp(); const t = useTheme(); const tk = session.token; const rid = session.user.id;
  const sp = assignment?.start_position || 1; const ep = assignment?.end_position || 999999;
  const [ws, setWs] = useState([]); const [prog, setProg] = useState({}); const [ld, setLd] = useState(true); const [err, setErr] = useState("");
  const load = useCallback(async () => { setLd(true); setErr(""); try { const [w, p] = await Promise.all([sb(`/rest/v1/websites?list_id=eq.${list.id}&position=gte.${sp}&position=lte.${ep}&order=position.asc&select=*`, { token: tk }), sb(`/rest/v1/progress?rep_id=eq.${rid}&select=*`, { token: tk })]); setWs(w || []); const m = {}; (p || []).forEach((x) => { m[x.website_id] = x; }); setProg(m); } catch (e) { setErr(e.message); } setLd(false); }, [list.id, sp, ep, rid, tk]);
  useEffect(() => { load(); }, [load]);
  const ups = async (wId, f, v) => { const ex = prog[wId]; setProg((p) => ({ ...p, [wId]: { ...ex, [f]: v, website_id: wId, rep_id: rid } })); try { if (ex?.id) await sb(`/rest/v1/progress?id=eq.${ex.id}`, { method: "PATCH", token: tk, body: { [f]: v, updated_at: new Date().toISOString() } }); else { const r = await sb("/rest/v1/progress?select=*", { method: "POST", prefer: "return=representation", token: tk, body: { website_id: wId, rep_id: rid, [f]: v } }); if (r?.[0]) setProg((p) => ({ ...p, [wId]: r[0] })); } } catch (e) { setProg((p) => ({ ...p, [wId]: ex })); setErr(e.message); } };
  const visit = (w) => { window.open(w.url.startsWith("http") ? w.url : `https://${w.url}`, "_blank"); if (!prog[w.id]?.visited) ups(w.id, "visited", true); };
  const vals = Object.values(prog).filter((p) => ws.some((w) => w.id === p.website_id));
  const st = { total: ws.length, visited: vals.filter((p) => p.visited).length, claimed: vals.filter((p) => p.claimed).length, notOpen: vals.filter((p) => p.not_open).length };
  if (ld) return <Loading />;
  return <div>
    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}>← Back</button>
    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: "-0.02em" }}>{list.name}</h2>
    <p style={{ color: t.text3, fontSize: 13, margin: "2px 0 16px" }}>Websites #{sp}–#{ep}</p>
    <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}><StatCard label="Assigned" value={st.total} /><StatCard label="Visited" value={st.visited} color={t.blue} /><StatCard label="Claimed" value={st.claimed} color={t.green} /><StatCard label="Not open" value={st.notOpen} color={t.red} /></div>
    <Err msg={err} />
    <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ borderBottom: `1px solid ${t.borderLight}` }}>{["#", "Website", "Visited", "Claimed", "Not open", "Last updated"].map((h, i) => <th key={h} style={{ padding: "12px 16px", textAlign: i >= 2 && i <= 4 ? "center" : "left", fontSize: 12, fontWeight: 400, color: t.text3 }}>{h}</th>)}</tr></thead>
      <tbody>{ws.map((w) => { const p = prog[w.id] || {}; return <tr key={w.id} style={{ borderBottom: `1px solid ${t.borderLight}` }}><td style={{ padding: "10px 16px", fontSize: 12, color: t.text4 }}>{w.position}</td><td style={{ padding: "10px 16px" }}><button onClick={() => visit(w)} style={{ background: "none", border: "none", color: t.blue, cursor: "pointer", fontSize: 14, padding: 0, textAlign: "left" }}>{w.url}</button></td><td style={{ padding: "10px 16px", textAlign: "center" }}><Check checked={!!p.visited} color={t.blue} disabled /></td><td style={{ padding: "10px 16px", textAlign: "center" }}><Check checked={!!p.claimed} color={t.green} onChange={() => ups(w.id, "claimed", !p.claimed)} /></td><td style={{ padding: "10px 16px", textAlign: "center" }}><Check checked={!!p.not_open} color={t.red} onChange={() => ups(w.id, "not_open", !p.not_open)} /></td><td style={{ padding: "10px 16px", fontSize: 12, color: t.text3 }}>{fmt(p.updated_at)}</td></tr>; })}</tbody></table></div>
  </div>;
}

// ─── REP APP ──────────────────────────────────────────────────────────────────
function RepApp() {
  const { session } = useApp(); const t = useTheme();
  const [al, setAl] = useState([]); const [sel, setSel] = useState(null); const [ld, setLd] = useState(true);
  useEffect(() => { sb(`/rest/v1/assignments?rep_id=eq.${session.user.id}&select=*,lists(*)`, { token: session.token }).then((d) => { setAl((d || []).filter((a) => a.lists)); setLd(false); }).catch(() => setLd(false)); }, [session.user.id, session.token]);
  if (sel) return <RepListView list={sel.lists} assignment={sel} onBack={() => setSel(null)} />;
  return <><h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: t.text, letterSpacing: "-0.02em" }}>My lists</h2>{ld ? <Loading /> : al.length === 0 ? <Empty text="No lists assigned" /> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>{al.map((a) => { const l = a.lists; const c = (a.end_position || 0) - (a.start_position || 0) + 1; return <div key={`${a.list_id}_${a.rep_id}`} onClick={() => setSel(a)} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = t.shadow)} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><span style={{ fontSize: 20 }}>📋</span><div style={{ fontWeight: 600, fontSize: 16, color: t.text }}>{l.name}</div></div><div style={{ fontSize: 13, color: t.text3, marginBottom: 10 }}>{c > 0 ? `${c} websites (#${a.start_position}–#${a.end_position})` : "All"}</div><div style={{ display: "flex", gap: 4 }}>{l.provider && <Badge>{l.provider}</Badge>}{l.state && <Badge>{l.state}</Badge>}</div></div>; })}</div>}</>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [view, setView] = useState("lists");
  const [isDark, setIsDark] = useState(false);
  const logout = useCallback(() => setSession(null), []);
  const theme = isDark ? dark : light;

  if (!session) return <LoginScreen onLogin={setSession} />;
  const isM = session.profile?.role === "manager";

  return (
    <AppCtx.Provider value={{ session, logout }}>
      <ThemeCtx.Provider value={theme}>
        <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: theme.text, background: theme.bg }}>
          <Sidebar view={view} setView={setView} alerts={alerts} isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
          <div style={{ flex: 1, padding: "28px 32px", minWidth: 0, overflow: "auto", background: theme.bg }}>
            {isM ? <ManagerApp view={view} setView={setView} setAlerts={setAlerts} /> : <RepApp />}
          </div>
        </div>
      </ThemeCtx.Provider>
    </AppCtx.Provider>
  );
}