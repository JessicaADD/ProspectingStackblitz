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
  if (!r.ok) throw new Error(d?.message || d?.error_description || "Failed"); return d;
}
async function loginAuth(e, p) { const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY }, body: JSON.stringify({ email: e, password: p }) }); const d = await r.json(); if (!r.ok) throw new Error(d?.error_description || "Invalid credentials"); return d; }
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);
function parseCSV(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onerror = () => rej(new Error("Read failed")); r.onload = (e) => { const l = e.target.result.split(/[\n\r,;]+/).map((x) => x.trim().replace(/^["']+|["']+$/g, "")).filter((x) => x && x.includes(".") && !/^(website|url|domain|http)/i.test(x)); res([...new Set(l)]); }; r.readAsText(file); }); }
const fmt = (d) => { if (!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const P = { blue: "#2563EB", indigo: "#4F46E5", bg: "#F8FAFC", text: "#0F172A", text2: "#475569", text3: "#94A3B8", border: "#E5E7EB", card: "#FFFFFF", green: "#059669", greenBg: "#ECFDF5", greenBorder: "#A7F3D0", red: "#DC2626", redBg: "#FEF2F2", redBorder: "#FECACA", amber: "#D97706", amberBg: "#FFFBEB", amberBorder: "#FDE68A", blueBg: "#EFF6FF", blueBorder: "#BFDBFE", sidebar: "#0F172A", shadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)", shadowMd: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)", shadowLg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)" };
const repC = [["#2563EB","#EFF6FF"],["#D97706","#FFFBEB"],["#DC2626","#FEF2F2"],["#059669","#ECFDF5"],["#7C3AED","#F5F3FF"],["#EC4899","#FDF2F8"]];
const font = "'Inter','Segoe UI',system-ui,-apple-system,sans-serif";
const inp = { width: "100%", padding: "10px 14px", background: P.card, border: `1.5px solid ${P.border}`, borderRadius: 8, color: P.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: font, transition: "border-color 0.15s, box-shadow 0.15s" };
const card = { background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, boxShadow: P.shadow, overflow: "hidden" };

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = "primary", small, style: s }) {
  const base = { padding: small ? "6px 14px" : "10px 20px", borderRadius: small ? 6 : 8, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 13 : 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap", fontFamily: font, lineHeight: 1.4 };
  const v = { primary: { background: P.blue, color: "#fff" }, secondary: { background: P.indigo, color: "#fff" }, success: { background: P.green, color: "#fff" }, ghost: { background: "transparent", border: `1.5px solid ${P.border}`, color: P.text2 }, danger: { background: P.redBg, border: `1px solid ${P.redBorder}`, color: P.red }, warning: { background: P.amberBg, border: `1px solid ${P.amberBorder}`, color: P.amber } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...s }}>{children}</button>;
}
function Badge({ children, color = P.blue, bg = P.blueBg }) { return <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", lineHeight: 1.5 }}>{children}</span>; }
function Avatar({ name, idx = 0, size = 30 }) { const c = repC[idx % repC.length]; const ini = (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2); return <div style={{ width: size, height: size, borderRadius: "50%", background: c[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.38), color: "#fff", fontWeight: 600, flexShrink: 0, border: `2px solid ${P.card}`, letterSpacing: "-0.02em" }}>{ini}</div>; }
function Check({ checked, onChange, color = P.blue, disabled }) { return <div onClick={disabled ? undefined : onChange} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? color : P.border}`, background: checked ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>{checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}</div>; }
function Spinner({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><circle cx="12" cy="12" r="10" fill="none" stroke={P.blue} strokeWidth="3" strokeDasharray="32 32" strokeLinecap="round" /></svg>; }
function Loading() { return <div style={{ padding: 60, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: P.text3, fontSize: 14 }}><Spinner size={20} /> Loading...</div>; }
function Empty({ icon = "📭", text }) { return <div style={{ padding: 60, textAlign: "center", color: P.text3, fontSize: 14 }}><div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>{text}</div>; }
function Err({ msg, onRetry }) { if (!msg) return null; return <div style={{ background: P.redBg, border: `1px solid ${P.redBorder}`, borderRadius: 8, padding: "12px 16px", color: P.red, fontSize: 14, display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span style={{ flex: 1 }}>{msg}</span>{onRetry && <Btn onClick={onRetry} variant="ghost" small>Retry</Btn>}</div>; }
function Progress({ pct = 0 }) { return <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><div style={{ background: "#E2E8F0", borderRadius: 20, height: 8, width: 100 }}><div style={{ background: P.blue, borderRadius: 20, height: 8, width: `${Math.min(100, pct)}%`, transition: "width 0.3s" }} /></div><span style={{ fontSize: 13, color: pct > 0 ? P.text2 : P.text3, fontWeight: 600, minWidth: 32 }}>{Math.round(pct)}%</span></div>; }
function StatCard({ label, value, color = P.text, icon }) { return <div style={{ ...card, padding: "20px 24px", flex: "1 1 0", minWidth: 100 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>{icon && <span style={{ fontSize: 16 }}>{icon}</span>}<span style={{ fontSize: 13, color: P.text3, fontWeight: 500 }}>{label}</span></div><div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div></div>; }

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const go = async () => { if (!email || !pw) return setErr("Please enter your email and password"); setLoading(true); setErr(""); try { const a = await loginAuth(email, pw); const p = await sb(`/rest/v1/profiles?id=eq.${a.user.id}&select=*`, { token: a.access_token }); if (!p?.[0]) throw new Error("Profile not found"); onLogin({ token: a.access_token, user: a.user, profile: p[0] }); } catch (e) { setErr(e.message); } setLoading(false); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 80, fontFamily: font, background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)", position: "relative", overflow: "hidden", padding: "40px 60px" }}>
      <div style={{ position: "absolute", top: -120, right: -60, width: 500, height: 500, borderRadius: "50%", background: "rgba(37,99,235,0.08)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -40, width: 400, height: 400, borderRadius: "50%", background: "rgba(79,70,229,0.06)" }} />
      <div style={{ position: "absolute", top: "50%", left: "35%", width: 200, height: 200, borderRadius: "50%", background: "rgba(37,99,235,0.04)" }} />
      <div style={{ maxWidth: 460, position: "relative", zIndex: 1 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h1 style={{ color: "#fff", fontSize: 40, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Auto Dealers Digital</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, margin: "0 0 56px", lineHeight: 1.5 }}>Prospecting workspace for your team</p>
        <div style={{ display: "flex", gap: 16 }}>
          {[["⚡", "Fast", "Find and track prospects at scale"], ["🎯", "Focused", "Reps see only their assigned work"], ["📈", "Measured", "Real-time progress tracking"]].map(([icon, title, desc]) => (
            <div key={title} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.5 }}>{desc}</div>
            </div>))}
        </div>
        <div style={{ marginTop: 60, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>© 2025 Auto Dealers Digital</div>
      </div>
      <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ width: 360, background: "rgba(255,255,255,0.97)", borderRadius: 16, padding: "40px 32px", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
          <h2 style={{ color: P.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Welcome back</h2>
          <p style={{ color: P.text3, fontSize: 15, margin: "0 0 28px" }}>Sign in to your account</p>
          <label style={{ display: "block", fontSize: 14, color: P.text2, marginBottom: 6, fontWeight: 500 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="you@company.com" type="email" style={{ ...inp, marginBottom: 16 }} />
          <label style={{ display: "block", fontSize: 14, color: P.text2, marginBottom: 6, fontWeight: 500 }}>Password</label>
          <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="••••••••" type="password" style={{ ...inp, marginBottom: 24 }} />
          {err && <div style={{ color: P.red, fontSize: 14, marginBottom: 16, padding: "10px 14px", background: P.redBg, borderRadius: 8, border: `1px solid ${P.redBorder}` }}>{err}</div>}
          <button onClick={go} disabled={loading} style={{ width: "100%", padding: 12, background: P.blue, border: "none", borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: font, transition: "opacity 0.15s" }}>
            {loading && <Spinner />} {loading ? "Signing in..." : "Sign in →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, alerts }) {
  const { session, logout } = useApp();
  const p = session.profile;
  const isM = p.role === "manager";
  const ini = (p.full_name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const ac = (alerts || []).length;
  const items = isM ? [["lists", "Lists", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6"], ["reps", "Reps", "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8"], ["alerts", "Alerts", "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"]] : [["lists", "My Lists", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6"]];

  return (
    <div style={{ width: 240, background: P.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "24px 20px 28px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Prospecting</span>
      </div>
      <div style={{ padding: "0 12px 0", fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8, paddingLeft: 20 }}>Menu</div>
      <div style={{ padding: "0 12px", flex: 1 }}>
        {items.map(([id, label, d]) => (
          <div key={id} onClick={() => setView(id)} style={{ padding: "10px 12px", borderRadius: 8, background: view === id ? "rgba(37,99,235,0.15)" : "transparent", color: view === id ? "#60A5FA" : "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: view === id ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 2, transition: "all 0.1s" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            {label}
            {id === "alerts" && ac > 0 && <span style={{ marginLeft: "auto", background: P.red, color: "#fff", borderRadius: 10, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, padding: "0 6px" }}>{ac}</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: P.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 600 }}>{ini}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: "#fff", fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.full_name}</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textTransform: "capitalize" }}>{p.role}</div></div>
        </div>
        <button onClick={logout} style={{ width: "100%", padding: "8px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: font }}>Sign out</button>
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function Modal({ children, onClose, width = 480 }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && onClose()}><div style={{ background: P.card, borderRadius: 16, padding: 32, width, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", boxShadow: P.shadowLg }}>{children}</div></div>;
}

function UploadModal({ onClose, onDone }) {
  const { session } = useApp();
  const [name, setName] = useState(""); const [prov, setProv] = useState(""); const [state, setState] = useState("");
  const [urls, setUrls] = useState([]); const [fn, setFn] = useState(""); const [ld, setLd] = useState(false); const [er, setEr] = useState("");
  const hf = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setFn(f.name); const p = await parseCSV(f); setUrls(p); setEr(p.length === 0 ? "No URLs found" : ""); } catch { setEr("Read failed"); } };
  const go = async () => { if (!name.trim()) return setEr("Name required"); if (!urls.length) return setEr("Upload CSV"); setLd(true); setEr(""); try { const l = await sb("/rest/v1/lists?select=*", { method: "POST", prefer: "return=representation", token: session.token, body: { name: name.trim(), provider: prov.trim() || null, state: state.trim() || null } }); if (!l?.[0]?.id) throw new Error("Failed"); const rows = urls.map((u, i) => ({ list_id: l[0].id, url: u, position: i + 1 })); for (let i = 0; i < rows.length; i += 100) await sb("/rest/v1/websites", { method: "POST", token: session.token, body: rows.slice(i, i + 100) }); onDone(); } catch (e) { setEr(e.message); } setLd(false); };
  return <Modal onClose={onClose}><h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: P.text }}>Upload new list</h2><p style={{ color: P.text3, fontSize: 14, margin: "0 0 24px" }}>Add a new prospecting list to your workspace</p>
    {[{ l: "List name", v: name, s: setName, p: "e.g. Florida Dentists Q1", req: true }, { l: "Provider", v: prov, s: setProv, p: "Optional" }, { l: "State", v: state, s: setState, p: "Optional" }].map((f) => <div key={f.l} style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 14, color: P.text2, marginBottom: 6, fontWeight: 500 }}>{f.l}{f.req && <span style={{ color: P.red }}> *</span>}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p} style={inp} /></div>)}
    <div style={{ marginBottom: 20 }}><label style={{ display: "block", fontSize: 14, color: P.text2, marginBottom: 6, fontWeight: 500 }}>CSV file <span style={{ color: P.red }}>*</span></label><label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 28, background: P.bg, border: `2px dashed ${P.border}`, borderRadius: 12, textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}><input type="file" accept=".csv,.txt" onChange={hf} style={{ display: "none" }} /><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={P.text3} strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg><div style={{ color: P.text2, fontSize: 14 }}>{fn || "Click to upload or drag and drop"}</div><div style={{ color: P.text3, fontSize: 12 }}>CSV or TXT file</div>{urls.length > 0 && <div style={{ color: P.green, fontSize: 14, fontWeight: 600 }}>✓ {urls.length} websites found</div>}</label></div>
    <Err msg={er} /><div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={ld}>{ld ? "Uploading..." : "Upload list"}</Btn></div></Modal>;
}

function AssignModal({ list, reps, assignments, wc, token, onClose, onDone }) {
  const ex = useMemo(() => assignments.map((a) => ({ rep_id: a.rep_id, name: a.profiles?.full_name || "?", start: a.start_position || 1, end: a.end_position || wc })), [assignments, wc]);
  const [slots, setSlots] = useState(() => ex.length > 0 ? ex : []);
  const [sel, setSel] = useState(""); const [ld, setLd] = useState(false); const [er, setEr] = useState("");
  const used = useMemo(() => new Set(slots.map((s) => s.rep_id)), [slots]);
  const avail = useMemo(() => reps.filter((r) => !used.has(r.id)), [reps, used]);
  const total = slots.reduce((s, x) => s + Math.max(0, (x.end || 0) - (x.start || 0) + 1), 0);
  const gc = (s) => Math.max(0, (s.end || 0) - (s.start || 0) + 1);
  const addRep = () => { if (!sel) return; const r = reps.find((x) => x.id === sel); if (r) setSlots((p) => [...p, { rep_id: r.id, name: r.full_name, start: 0, end: 0 }]); setSel(""); };
  const rmSlot = (i) => { setSlots((p) => { const n = p.filter((_, j) => j !== i); let pos = 1; return n.map((s) => { const c = gc(s); const st = pos; pos += c; return { ...s, start: st, end: st + c - 1 }; }); }); };
  const setCount = (idx, v) => { const count = Math.max(0, parseInt(v) || 0); setSlots((prev) => { const n = [...prev]; const rem = wc - count; const oth = n.filter((_, i) => i !== idx); if (oth.length > 0 && rem >= 0) { const per = Math.floor(rem / oth.length); const r = rem % oth.length; let oi = 0; for (let i = 0; i < n.length; i++) { if (i === idx) continue; n[i] = { ...n[i], _c: per + (oi < r ? 1 : 0) }; oi++; } } let pos = 1; for (let i = 0; i < n.length; i++) { const c = i === idx ? count : (n[i]._c ?? gc(n[i])); n[i] = { ...n[i], start: pos, end: pos + Math.max(0, c) - 1 }; pos += Math.max(0, c); delete n[i]._c; } return n; }); };
  const dist = () => { if (!slots.length) return; const p = Math.floor(wc / slots.length); const r = wc % slots.length; let pos = 1; setSlots((s) => s.map((x, i) => { const c = p + (i < r ? 1 : 0); const st = pos; pos += c; return { ...x, start: st, end: st + c - 1 }; })); };
  const validate = () => { for (const s of slots) { if (s.start < 1 || s.end < 1 || s.start > s.end) return "Invalid range"; if (s.end > wc) return `Exceeds ${wc}`; } const sr = [...slots].sort((a, b) => a.start - b.start); for (let i = 1; i < sr.length; i++) if (sr[i].start <= sr[i - 1].end) return "Overlap"; return null; };
  const go = async () => { if (!slots.length) return setEr("Add a rep"); const e = validate(); if (e) return setEr(e); setLd(true); setEr(""); try { await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token }); for (const s of slots) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: s.rep_id, start_position: s.start, end_position: s.end } }); onDone(); } catch (e) { setEr(e.message); } setLd(false); };
  const ni = { padding: "8px 10px", background: P.card, border: `1.5px solid ${P.border}`, borderRadius: 6, color: P.text, fontSize: 14, textAlign: "center", outline: "none", width: 65, fontFamily: font };
  return <Modal onClose={onClose} width={560}><h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: P.text }}>Assign reps</h2><p style={{ color: P.text3, fontSize: 14, margin: "0 0 20px" }}>{list.name} · {wc} websites</p>
    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}><StatCard label="Total" value={wc} icon="📊" /><StatCard label="Assigned" value={total} color={P.green} icon="✅" /><StatCard label="Open" value={Math.max(0, wc - total)} color={wc - total > 0 ? P.red : P.text3} icon="📋" /></div>
    {slots.length > 0 && <div style={{ ...card, padding: "0 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, padding: "12px 0", fontSize: 11, fontWeight: 600, color: P.text3, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${P.border}` }}><div style={{ flex: 1 }}>Rep</div><div style={{ width: 65, textAlign: "center" }}>Count</div><div style={{ width: 55, textAlign: "center" }}>From</div><div style={{ width: 55, textAlign: "center" }}>To</div><div style={{ width: 28 }} /></div>
      {slots.map((s, i) => <div key={s.rep_id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: i < slots.length - 1 ? `1px solid #F1F5F9` : "none" }}><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}><Avatar name={s.name} idx={i} size={28} /><span style={{ fontWeight: 500, fontSize: 14, color: P.text }}>{s.name}</span></div><input value={gc(s) || ""} onChange={(e) => setCount(i, e.target.value)} style={ni} placeholder="0" /><input value={s.start || ""} readOnly style={{ ...ni, background: P.bg, color: P.text3, width: 55 }} /><input value={s.end || ""} readOnly style={{ ...ni, background: P.bg, color: P.text3, width: 55 }} /><button onClick={() => rmSlot(i)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: P.redBg, color: P.red, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button></div>)}
    </div>}
    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>{avail.length > 0 && <><select value={sel} onChange={(e) => setSel(e.target.value)} style={{ ...inp, width: "auto", padding: "8px 12px", fontSize: 13 }}><option value="">Add rep...</option>{avail.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select><Btn onClick={addRep} disabled={!sel} small>+ Add</Btn></>}{slots.length > 0 && <Btn onClick={dist} variant="ghost" small>Distribute evenly</Btn>}</div>
    <Err msg={er} /><div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${P.border}`, paddingTop: 16 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={ld}>{ld ? "Saving..." : "Save assignments"}</Btn></div></Modal>;
}

function ReassignModal({ list, reps, assignments, websites, progress, token, onClose, onDone }) {
  const [fromRep, setFromRep] = useState(""); const [toRep, setToRep] = useState(""); const [mode, setMode] = useState("unvisited"); const [selPos, setSelPos] = useState(new Set()); const [ld, setLd] = useState(false); const [er, setEr] = useState("");
  const fromA = assignments.find((a) => a.rep_id === fromRep); const toA = assignments.find((a) => a.rep_id === toRep);
  const fromWs = useMemo(() => fromA ? websites.filter((w) => w.position >= (fromA.start_position || 1) && w.position <= (fromA.end_position || 999999)) : [], [fromA, websites]);
  const unvis = useMemo(() => fromWs.filter((w) => !progress.find((p) => p.website_id === w.id && p.rep_id === fromRep)?.visited), [fromWs, progress, fromRep]);
  const moving = mode === "all" ? fromWs : mode === "unvisited" ? unvis : fromWs.filter((w) => selPos.has(w.position));
  const mc = moving.length; const toOpts = reps.filter((r) => r.id !== fromRep);
  const go = async () => { if (!fromRep || !toRep) return setEr("Select both reps"); if (fromRep === toRep) return setEr("Same rep"); if (!mc) return setEr("Nothing to move"); setLd(true); setEr(""); try { const mp = moving.map((w) => w.position).sort((a, b) => a - b); const rem = fromWs.filter((w) => !mp.includes(w.position)).map((w) => w.position).sort((a, b) => a - b); let ntp; if (toA) { const tp = websites.filter((w) => w.position >= (toA.start_position || 0) && w.position <= (toA.end_position || 0)).map((w) => w.position); ntp = [...tp, ...mp].sort((a, b) => a - b); } else ntp = [...mp].sort((a, b) => a - b); await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${fromRep}`, { method: "DELETE", token }); if (toA) await sb(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${toRep}`, { method: "DELETE", token }); if (rem.length) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: fromRep, start_position: Math.min(...rem), end_position: Math.max(...rem) } }); if (ntp.length) await sb("/rest/v1/assignments", { method: "POST", token, body: { list_id: list.id, rep_id: toRep, start_position: Math.min(...ntp), end_position: Math.max(...ntp) } }); onDone(); } catch (e) { setEr(e.message); } setLd(false); };
  return <Modal onClose={onClose} width={560}><h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: P.text }}>Reassign websites</h2><p style={{ color: P.text3, fontSize: 14, margin: "0 0 20px" }}>Move websites from one rep to another</p>
    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}><div style={{ flex: 1 }}><label style={{ fontSize: 14, color: P.text2, marginBottom: 6, display: "block", fontWeight: 500 }}>From rep</label><select value={fromRep} onChange={(e) => { setFromRep(e.target.value); setSelPos(new Set()); setToRep(""); }} style={inp}><option value="">Select...</option>{assignments.map((a) => <option key={a.rep_id} value={a.rep_id}>{a.profiles?.full_name} (#{a.start_position}–#{a.end_position})</option>)}</select></div><div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 10, fontSize: 20, color: P.text3 }}>→</div><div style={{ flex: 1 }}><label style={{ fontSize: 14, color: P.text2, marginBottom: 6, display: "block", fontWeight: 500 }}>To rep</label><select value={toRep} onChange={(e) => setToRep(e.target.value)} style={inp}><option value="">Select...</option>{toOpts.map((r) => { const a = assignments.find((a) => a.rep_id === r.id); return <option key={r.id} value={r.id}>{r.full_name}{a ? ` (#${a.start_position}–#${a.end_position})` : " (new)"}</option>; })}</select></div></div>
    {fromRep && <><div style={{ marginBottom: 16 }}><div style={{ fontSize: 14, color: P.text2, marginBottom: 8, fontWeight: 500 }}>What to move</div><div style={{ display: "flex", gap: 8 }}>{[["unvisited", `Unvisited (${unvis.length})`], ["all", `All (${fromWs.length})`], ["selected", "Manual"]].map(([v, l]) => <button key={v} onClick={() => setMode(v)} style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${mode === v ? P.blue : P.border}`, background: mode === v ? P.blueBg : P.card, color: mode === v ? P.blue : P.text2, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: font }}>{l}</button>)}</div></div>
      {mode === "selected" && <div style={{ maxHeight: 200, overflow: "auto", ...card, marginBottom: 16 }}>{fromWs.map((w) => { const vis = progress.find((p) => p.website_id === w.id && p.rep_id === fromRep)?.visited; return <div key={w.id} onClick={() => setSelPos((p) => { const n = new Set(p); n.has(w.position) ? n.delete(w.position) : n.add(w.position); return n; })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid #F1F5F9`, cursor: "pointer", background: selPos.has(w.position) ? P.blueBg : "transparent" }}><Check checked={selPos.has(w.position)} /><span style={{ fontSize: 12, color: P.text3, width: 32 }}>#{w.position}</span><span style={{ fontSize: 14, color: P.text, flex: 1 }}>{w.url}</span>{vis && <Badge color={P.blue} bg={P.blueBg}>Visited</Badge>}</div>; })}</div>}
      {mc > 0 && <div style={{ background: P.amberBg, border: `1px solid ${P.amberBorder}`, borderRadius: 8, padding: "12px 16px", fontSize: 14, color: P.amber, marginBottom: 16, fontWeight: 500 }}>⚠️ {mc} website{mc !== 1 ? "s" : ""} will be moved{toRep ? ` to ${reps.find((r) => r.id === toRep)?.full_name}` : ""}</div>}</>}
    <Err msg={er} /><div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${P.border}`, paddingTop: 16 }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={ld || !fromRep || !toRep || !mc} variant="warning">{ld ? "Moving..." : `Move ${mc} website${mc !== 1 ? "s" : ""}`}</Btn></div></Modal>;
}

function EditListModal({ list, token, onClose, onDone }) {
  const [name, setName] = useState(list.name || ""); const [prov, setProv] = useState(list.provider || ""); const [state, setState] = useState(list.state || "");
  const [urls, setUrls] = useState([]); const [fn, setFn] = useState(""); const [repl, setRepl] = useState(false); const [ld, setLd] = useState(false); const [er, setEr] = useState("");
  const hf = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setFn(f.name); const p = await parseCSV(f); setUrls(p); } catch { setEr("Read failed"); } };
  const go = async () => { if (!name.trim()) return setEr("Name required"); setLd(true); setEr(""); try { await sb(`/rest/v1/lists?id=eq.${list.id}`, { method: "PATCH", token, body: { name: name.trim(), provider: prov.trim() || null, state: state.trim() || null } }); if (repl && urls.length) { await sb(`/rest/v1/websites?list_id=eq.${list.id}`, { method: "DELETE", token }); await sb(`/rest/v1/assignments?list_id=eq.${list.id}`, { method: "DELETE", token }); const rows = urls.map((u, i) => ({ list_id: list.id, url: u, position: i + 1 })); for (let i = 0; i < rows.length; i += 100) await sb("/rest/v1/websites", { method: "POST", token, body: rows.slice(i, i + 100) }); } onDone(); } catch (e) { setEr(e.message); } setLd(false); };
  return <Modal onClose={onClose}><h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: P.text }}>Edit list</h2><p style={{ color: P.text3, fontSize: 14, margin: "0 0 24px" }}>Update list details or replace CSV</p>
    {[{ l: "Name", v: name, s: setName }, { l: "Provider", v: prov, s: setProv }, { l: "State", v: state, s: setState }].map((f) => <div key={f.l} style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 14, color: P.text2, marginBottom: 6, fontWeight: 500 }}>{f.l}</label><input value={f.v} onChange={(e) => f.s(e.target.value)} style={inp} /></div>)}
    {!repl ? <div style={{ marginBottom: 20 }}><Btn onClick={() => setRepl(true)} variant="danger" small>Replace CSV file</Btn><p style={{ fontSize: 13, color: P.text3, marginTop: 6 }}>This will delete all websites and assignments</p></div> : <div style={{ marginBottom: 20 }}><label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 24, background: P.redBg, border: `2px dashed ${P.redBorder}`, borderRadius: 12, textAlign: "center", cursor: "pointer" }}><input type="file" accept=".csv,.txt" onChange={hf} style={{ display: "none" }} /><div style={{ color: P.red, fontSize: 14, fontWeight: 500 }}>{fn || "Select new CSV"}</div>{urls.length > 0 && <div style={{ color: P.green, fontSize: 13, fontWeight: 600 }}>✓ {urls.length} found</div>}</label><button onClick={() => { setRepl(false); setUrls([]); }} style={{ background: "none", border: "none", color: P.text3, cursor: "pointer", fontSize: 13, marginTop: 6, fontFamily: font }}>Cancel replacement</button></div>}
    <Err msg={er} /><div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn onClick={onClose} variant="ghost">Cancel</Btn><Btn onClick={go} disabled={ld}>{ld ? "Saving..." : "Save changes"}</Btn></div></Modal>;
}

// ─── LIST DETAIL ──────────────────────────────────────────────────────────────
function MgrListDetail({ list, reps, onBack }) {
  const { session } = useApp(); const tk = session.token;
  const [ws, setWs] = useState([]); const [prog, setProg] = useState([]); const [asgn, setAsgn] = useState([]);
  const [ld, setLd] = useState(true); const [er, setEr] = useState("");
  const [showAssign, setShowAssign] = useState(false); const [showReassign, setShowReassign] = useState(false); const [showEdit, setShowEdit] = useState(false);
  const [cur, setCur] = useState(list);
  const load = useCallback(async () => { setLd(true); setEr(""); try { const [ls, w, p, a] = await Promise.all([sb(`/rest/v1/lists?id=eq.${cur.id}&select=*`, { token: tk }), sb(`/rest/v1/websites?list_id=eq.${cur.id}&order=position.asc&select=*`, { token: tk }), sb(`/rest/v1/progress?select=*`, { token: tk }), sb(`/rest/v1/assignments?list_id=eq.${cur.id}&select=*,profiles(full_name,id)`, { token: tk })]); if (ls?.[0]) setCur(ls[0]); setWs(w || []); setProg(p || []); setAsgn(a || []); } catch (e) { setEr(e.message); } setLd(false); }, [cur.id, tk]);
  useEffect(() => { load(); }, [load]);
  const rs = useCallback((a) => { const rw = ws.filter((w) => w.position >= (a.start_position || 1) && w.position <= (a.end_position || ws.length)); const ids = new Set(rw.map((w) => w.id)); const rp = prog.filter((p) => p.rep_id === a.rep_id && ids.has(p.website_id)); return { total: rw.length, visited: rp.filter((p) => p.visited).length, claimed: rp.filter((p) => p.claimed).length, notOpen: rp.filter((p) => p.not_open).length }; }, [prog, ws]);
  if (ld) return <Loading />;
  return <div>
    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: P.blue, cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0, fontWeight: 500, fontFamily: font }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.blue} strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to lists
    </button>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 6 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: P.text, letterSpacing: "-0.02em" }}>{cur.name}</h1>
      {cur.provider && <Badge>{cur.provider}</Badge>}
      {cur.state && <Badge color={P.text2} bg="#F1F5F9">{cur.state}</Badge>}
      <Btn onClick={() => setShowEdit(true)} variant="ghost" small>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit
      </Btn>
    </div>
    <p style={{ color: P.text3, fontSize: 15, margin: "0 0 24px" }}>{ws.length} websites in this list</p>
    <Err msg={er} onRetry={load} />

    {/* Team section */}
    <div style={{ ...card, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: P.text }}>Team assignments</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {asgn.length >= 1 && <Btn onClick={() => setShowReassign(true)} variant="warning" small>↔ Reassign</Btn>}
          <Btn onClick={() => setShowAssign(true)} small>{asgn.length > 0 ? "Edit assignments" : "Assign reps"}</Btn>
        </div>
      </div>
      {asgn.length === 0 ? <p style={{ color: P.text3, fontSize: 14, margin: 0 }}>No reps assigned yet. Click "Assign reps" to get started.</p> :
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{asgn.map((a, i) => { const s = rs(a); const pct = s.total > 0 ? (s.visited / s.total) * 100 : 0; return <div key={a.rep_id} style={{ background: P.greenBg, border: `1px solid ${P.greenBorder}`, borderRadius: 10, padding: "16px 20px", minWidth: 200, flex: "1 1 200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><Avatar name={a.profiles?.full_name} idx={i} size={32} /><div><div style={{ fontWeight: 600, color: P.green, fontSize: 15 }}>{a.profiles?.full_name}</div><div style={{ fontSize: 13, color: P.text3 }}>#{a.start_position}–#{a.end_position} ({s.total} sites)</div></div></div>
        <Progress pct={pct} />
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: P.text2, marginTop: 10 }}><span>👁 {s.visited} visited</span><span>✅ {s.claimed} claimed</span><span>🚫 {s.notOpen} not open</span></div>
      </div>; })}</div>}
    </div>

    {/* Website table */}
    <div style={card}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${P.border}` }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: P.text }}>All websites</h3>
      </div>
      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead><tr style={{ background: P.bg }}>{["#", "Website", "Assigned to", "Last activity", ...asgn.map((a) => a.profiles?.full_name)].map((h, i) => <th key={i} style={{ padding: "12px 16px", textAlign: i > 2 ? "center" : "left", fontSize: 12, fontWeight: 600, color: P.text3, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${P.border}` }}>{h}</th>)}</tr></thead>
          <tbody>{ws.length === 0 && <tr><td colSpan={4 + asgn.length}><Empty text="No websites" /></td></tr>}
            {ws.map((w) => { const as = asgn.find((a) => w.position >= (a.start_position || 1) && w.position <= (a.end_position || ws.length)); const wp = prog.filter((p) => p.website_id === w.id); const la = wp.reduce((l, p) => { const d = p.updated_at; return d && (!l || new Date(d) > new Date(l)) ? d : l; }, null);
              return <tr key={w.id} style={{ borderBottom: `1px solid #F1F5F9` }}>
                <td style={{ padding: "12px 16px", fontSize: 13, color: P.text3 }}>{w.position}</td>
                <td style={{ padding: "12px 16px" }}><a href={w.url.startsWith("http") ? w.url : `https://${w.url}`} target="_blank" rel="noreferrer" style={{ color: P.blue, fontSize: 14, textDecoration: "none", fontWeight: 500 }}>{w.url}</a></td>
                <td style={{ padding: "12px 16px" }}>{as ? <Badge color={P.green} bg={P.greenBg}>{as.profiles?.full_name}</Badge> : <span style={{ color: P.text3 }}>—</span>}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: P.text3 }}>{fmt(la)}</td>
                {asgn.map((a) => { if (w.position < (a.start_position || 1) || w.position > (a.end_position || ws.length)) return <td key={a.rep_id} style={{ padding: "12px 16px", textAlign: "center", color: "#E2E8F0" }}>—</td>; const p = prog.find((p) => p.website_id === w.id && p.rep_id === a.rep_id); return <td key={a.rep_id} style={{ padding: "12px 16px", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", gap: 8, fontSize: 14 }}><span>{p?.visited ? "👁" : "·"}</span><span>{p?.claimed ? "✅" : "·"}</span><span>{p?.not_open ? "🚫" : "·"}</span></div></td>; })}
              </tr>; })}</tbody>
        </table>
      </div>
    </div>
    {showAssign && <AssignModal list={cur} reps={reps} assignments={asgn} wc={ws.length} token={tk} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); load(); }} />}
    {showReassign && <ReassignModal list={cur} reps={reps} assignments={asgn} websites={ws} progress={prog} token={tk} onClose={() => setShowReassign(false)} onDone={() => { setShowReassign(false); load(); }} />}
    {showEdit && <EditListModal list={cur} token={tk} onClose={() => setShowEdit(false)} onDone={() => { setShowEdit(false); load(); }} />}
  </div>;
}

// ─── MANAGER VIEWS ────────────────────────────────────────────────────────────
function AlertsView({ alerts }) { const da = (d) => Math.floor((new Date() - new Date(d)) / 86400000); return <div><h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, color: P.text, letterSpacing: "-0.02em" }}>Alerts</h1><p style={{ fontSize: 15, color: P.text3, marginBottom: 24 }}>Reps with no activity after 7+ days</p>{alerts.length === 0 ? <div style={card}><Empty icon="🔔" text="No alerts — all reps are active" /></div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{alerts.map((a) => <div key={a.id} style={{ ...card, padding: "18px 24px", display: "flex", gap: 16, alignItems: "center" }}><div style={{ width: 42, height: 42, borderRadius: 10, background: P.amberBg, border: `1px solid ${P.amberBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚠️</div><div style={{ flex: 1 }}><div style={{ fontSize: 15, color: P.text, lineHeight: 1.5 }}><span style={{ fontWeight: 600 }}>{a.repName}</span> hasn't opened any website from <span style={{ fontWeight: 600 }}>{a.listName}</span></div><div style={{ fontSize: 13, color: P.text3, marginTop: 2 }}>Assigned {da(a.assignedAt)} days ago</div></div></div>)}</div>}</div>; }

function RepOverview({ reps, lists }) { const { session } = useApp(); const [prog, setProg] = useState([]); const [ld, setLd] = useState(true); useEffect(() => { sb("/rest/v1/progress?select=*", { token: session.token }).then((d) => { setProg(d || []); setLd(false); }).catch(() => setLd(false)); }, [session.token]); if (ld) return <Loading />; return <div style={card}><div style={{ overflow: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: P.bg }}>{["Rep", "Lists", "Visited", "Claimed", "Not open", "Last active"].map((h) => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: P.text3, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${P.border}` }}>{h}</th>)}</tr></thead><tbody>{reps.map((r, i) => { const rp = prog.filter((p) => p.rep_id === r.id); const la = rp.reduce((l, p) => { const d = p.updated_at; return d && (!l || new Date(d) > new Date(l)) ? d : l; }, null); return <tr key={r.id} style={{ borderBottom: `1px solid #F1F5F9` }}><td style={{ padding: "14px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={r.full_name} idx={i} size={32} /><span style={{ fontWeight: 500, fontSize: 15, color: P.text }}>{r.full_name}</span></div></td><td style={{ padding: "14px 16px", color: P.text2, fontSize: 14 }}>{lists.filter((l) => l.assignments?.some((a) => a.rep_id === r.id)).length}</td><td style={{ padding: "14px 16px" }}><Badge color={P.blue} bg={P.blueBg}>{rp.filter((p) => p.visited).length}</Badge></td><td style={{ padding: "14px 16px" }}><Badge color={P.green} bg={P.greenBg}>{rp.filter((p) => p.claimed).length}</Badge></td><td style={{ padding: "14px 16px" }}><Badge color={P.red} bg={P.redBg}>{rp.filter((p) => p.not_open).length}</Badge></td><td style={{ padding: "14px 16px", fontSize: 13, color: P.text3 }}>{fmt(la)}</td></tr>; })}</tbody></table></div></div>; }

// ─── MANAGER APP ──────────────────────────────────────────────────────────────
function ManagerApp({ view, setView, setAlerts }) {
  const { session } = useApp(); const tk = session.token;
  const [lists, setLists] = useState([]); const [reps, setReps] = useState([]);
  const [sel, setSel] = useState(null); const [showUp, setShowUp] = useState(false);
  const [ld, setLd] = useState(true); const [er, setEr] = useState(""); const [alerts, setLA] = useState([]);
  const load = useCallback(async () => { setLd(true); setEr(""); try { const [ls, rs, pr] = await Promise.all([sb("/rest/v1/lists?select=*,assignments(rep_id,start_position,end_position,created_at,profiles(full_name))&order=created_at.desc", { token: tk }), sb("/rest/v1/profiles?role=eq.rep&app=eq.prospecting&select=*&order=full_name.asc", { token: tk }), sb("/rest/v1/progress?select=*", { token: tk })]); setLists(ls || []); setReps(rs || []); const now = new Date(); const al = []; for (const l of (ls || [])) { if (!l.assignments) continue; for (const a of l.assignments) { if (!a.created_at || Math.floor((now - new Date(a.created_at)) / 86400000) < 7) continue; if (!(pr || []).some((p) => p.rep_id === a.rep_id && p.visited)) al.push({ id: `${l.id}_${a.rep_id}`, listName: l.name, repName: a.profiles?.full_name || "?", assignedAt: a.created_at }); } } setLA(al); setAlerts(al); } catch (e) { setEr(e.message); } setLd(false); }, [tk, setAlerts]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (sel && (view === "reps" || view === "alerts")) setSel(null); }, [view, sel]);

  if (sel && view === "lists") return <MgrListDetail list={sel} reps={reps} onBack={() => { setSel(null); load(); }} />;
  if (view === "alerts") return <AlertsView alerts={alerts} />;
  if (view === "reps") return <div><h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, color: P.text, letterSpacing: "-0.02em" }}>Reps</h1><p style={{ fontSize: 15, color: P.text3, marginBottom: 24 }}>Monitor your team's activity and progress</p>{ld ? <Loading /> : <RepOverview reps={reps} lists={lists} />}</div>;

  return <>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
      <div><h1 style={{ fontSize: 28, fontWeight: 700, color: P.text, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Lists</h1><p style={{ fontSize: 15, color: P.text3, margin: 0 }}>Manage your prospecting lists</p></div>
      <Btn onClick={() => setShowUp(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg> New list
      </Btn>
    </div>
    <Err msg={er} onRetry={load} />
    {ld ? <Loading /> : <div style={card}><div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: P.bg }}>{["Name", "Provider", "Team", "Progress", "Created", ""].map((h) => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: P.text3, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${P.border}` }}>{h}</th>)}</tr></thead>
        <tbody>{lists.length === 0 && <tr><td colSpan={6}><Empty text="No lists yet — click 'New list' to get started" /></td></tr>}
          {lists.map((l) => <tr key={l.id} style={{ borderBottom: `1px solid #F1F5F9`, cursor: "pointer" }} onClick={() => { setSel(l); setView("lists"); }} onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <td style={{ padding: "16px" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 36, height: 36, borderRadius: 8, background: P.blueBg, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.blue} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></div><div><div style={{ fontSize: 15, fontWeight: 600, color: P.text }}>{l.name}</div>{l.state && <div style={{ fontSize: 13, color: P.text3 }}>{l.state}</div>}</div></div></td>
            <td style={{ padding: "16px" }}>{l.provider ? <Badge>{l.provider}</Badge> : <span style={{ color: P.text3 }}>—</span>}</td>
            <td style={{ padding: "16px" }}>{l.assignments?.length > 0 ? <div style={{ display: "flex" }}>{l.assignments.slice(0, 5).map((a, i) => <Avatar key={a.rep_id} name={a.profiles?.full_name} idx={i} size={30} />)}{l.assignments.length > 5 && <span style={{ fontSize: 12, color: P.text3, alignSelf: "center", marginLeft: 4 }}>+{l.assignments.length - 5}</span>}</div> : <span style={{ color: P.text3, fontSize: 13 }}>—</span>}</td>
            <td style={{ padding: "16px" }}><Progress pct={0} /></td>
            <td style={{ padding: "16px", fontSize: 13, color: P.text3 }}>{fmt(l.created_at)}</td>
            <td style={{ padding: "16px", textAlign: "right" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.text3} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></td>
          </tr>)}</tbody>
      </table>
    </div></div>}
    {showUp && <UploadModal onClose={() => setShowUp(false)} onDone={() => { setShowUp(false); load(); }} />}
  </>;
}

// ─── REP VIEWS ────────────────────────────────────────────────────────────────
function RepListView({ list, assignment, onBack }) {
  const { session } = useApp(); const tk = session.token; const rid = session.user.id;
  const sp = assignment?.start_position || 1; const ep = assignment?.end_position || 999999;
  const [ws, setWs] = useState([]); const [prog, setProg] = useState({}); const [ld, setLd] = useState(true); const [er, setEr] = useState("");
  const load = useCallback(async () => { setLd(true); setEr(""); try { const [w, p] = await Promise.all([sb(`/rest/v1/websites?list_id=eq.${list.id}&position=gte.${sp}&position=lte.${ep}&order=position.asc&select=*`, { token: tk }), sb(`/rest/v1/progress?rep_id=eq.${rid}&select=*`, { token: tk })]); setWs(w || []); const m = {}; (p || []).forEach((x) => { m[x.website_id] = x; }); setProg(m); } catch (e) { setEr(e.message); } setLd(false); }, [list.id, sp, ep, rid, tk]);
  useEffect(() => { load(); }, [load]);
  const ups = async (wId, f, v) => { const ex = prog[wId]; setProg((p) => ({ ...p, [wId]: { ...ex, [f]: v, website_id: wId, rep_id: rid } })); try { if (ex?.id) await sb(`/rest/v1/progress?id=eq.${ex.id}`, { method: "PATCH", token: tk, body: { [f]: v, updated_at: new Date().toISOString() } }); else { const r = await sb("/rest/v1/progress?select=*", { method: "POST", prefer: "return=representation", token: tk, body: { website_id: wId, rep_id: rid, [f]: v } }); if (r?.[0]) setProg((p) => ({ ...p, [wId]: r[0] })); } } catch (e) { setProg((p) => ({ ...p, [wId]: ex })); setEr(e.message); } };
  const visit = (w) => { window.open(w.url.startsWith("http") ? w.url : `https://${w.url}`, "_blank"); if (!prog[w.id]?.visited) ups(w.id, "visited", true); };
  const vals = Object.values(prog).filter((p) => ws.some((w) => w.id === p.website_id));
  const st = { total: ws.length, visited: vals.filter((p) => p.visited).length, claimed: vals.filter((p) => p.claimed).length, notOpen: vals.filter((p) => p.not_open).length };
  if (ld) return <Loading />;
  return <div>
    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: P.blue, cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0, fontWeight: 500, fontFamily: font }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.blue} strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back</button>
    <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color: P.text, letterSpacing: "-0.02em" }}>{list.name}</h1>
    <p style={{ color: P.text3, fontSize: 15, margin: "0 0 24px" }}>Your websites: #{sp}–#{ep}</p>
    <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}><StatCard label="Assigned" value={st.total} icon="📋" /><StatCard label="Visited" value={st.visited} color={P.blue} icon="👁" /><StatCard label="Claimed" value={st.claimed} color={P.green} icon="✅" /><StatCard label="Not open" value={st.notOpen} color={P.red} icon="🚫" /></div>
    <Err msg={er} />
    <div style={card}><div style={{ overflow: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: P.bg }}>{["#", "Website", "Visited", "Claimed", "Not open", "Last updated"].map((h, i) => <th key={h} style={{ padding: "12px 16px", textAlign: i >= 2 && i <= 4 ? "center" : "left", fontSize: 12, fontWeight: 600, color: P.text3, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${P.border}` }}>{h}</th>)}</tr></thead>
      <tbody>{ws.map((w) => { const p = prog[w.id] || {}; return <tr key={w.id} style={{ borderBottom: `1px solid #F1F5F9` }}><td style={{ padding: "12px 16px", fontSize: 13, color: P.text3 }}>{w.position}</td><td style={{ padding: "12px 16px" }}><button onClick={() => visit(w)} style={{ background: "none", border: "none", color: P.blue, cursor: "pointer", fontSize: 14, padding: 0, textAlign: "left", fontWeight: 500, fontFamily: font }}>{w.url}</button></td><td style={{ padding: "12px 16px", textAlign: "center" }}><Check checked={!!p.visited} color={P.blue} disabled /></td><td style={{ padding: "12px 16px", textAlign: "center" }}><Check checked={!!p.claimed} color={P.green} onChange={() => ups(w.id, "claimed", !p.claimed)} /></td><td style={{ padding: "12px 16px", textAlign: "center" }}><Check checked={!!p.not_open} color={P.red} onChange={() => ups(w.id, "not_open", !p.not_open)} /></td><td style={{ padding: "12px 16px", fontSize: 13, color: P.text3 }}>{fmt(p.updated_at)}</td></tr>; })}</tbody></table></div></div>
  </div>;
}

function RepApp() {
  const { session } = useApp();
  const [al, setAl] = useState([]); const [sel, setSel] = useState(null); const [ld, setLd] = useState(true);
  useEffect(() => { sb(`/rest/v1/assignments?rep_id=eq.${session.user.id}&select=*,lists(*)`, { token: session.token }).then((d) => { setAl((d || []).filter((a) => a.lists)); setLd(false); }).catch(() => setLd(false)); }, [session.user.id, session.token]);
  if (sel) return <RepListView list={sel.lists} assignment={sel} onBack={() => setSel(null)} />;
  return <><h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, color: P.text, letterSpacing: "-0.02em" }}>My lists</h1><p style={{ fontSize: 15, color: P.text3, marginBottom: 24 }}>Your assigned prospecting lists</p>{ld ? <Loading /> : al.length === 0 ? <div style={card}><Empty text="No lists assigned yet" /></div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>{al.map((a) => { const l = a.lists; const c = (a.end_position || 0) - (a.start_position || 0) + 1; return <div key={`${a.list_id}_${a.rep_id}`} onClick={() => setSel(a)} style={{ ...card, padding: 24, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = P.blue; e.currentTarget.style.boxShadow = P.shadowMd; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.boxShadow = P.shadow; }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><div style={{ width: 36, height: 36, borderRadius: 8, background: P.blueBg, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.blue} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div><div style={{ fontWeight: 600, fontSize: 16, color: P.text }}>{l.name}</div></div>
    <div style={{ fontSize: 14, color: P.text3, marginBottom: 14 }}>{c > 0 ? `${c} websites (#${a.start_position}–#${a.end_position})` : "All websites"}</div>
    <div style={{ display: "flex", gap: 6 }}>{l.provider && <Badge>{l.provider}</Badge>}{l.state && <Badge color={P.text2} bg="#F1F5F9">{l.state}</Badge>}</div>
  </div>; })}</div>}</>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [view, setView] = useState("lists");
  const logout = useCallback(() => setSession(null), []);
  if (!session) return <LoginScreen onLogin={setSession} />;
  const isM = session.profile?.role === "manager";
  return (
    <AppCtx.Provider value={{ session, logout }}>
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: font, color: P.text, background: P.bg }}>
        <Sidebar view={view} setView={setView} alerts={alerts} />
        <div style={{ flex: 1, padding: "32px 36px", minWidth: 0, overflow: "auto" }}>
          {isM ? <ManagerApp view={view} setView={setView} setAlerts={setAlerts} /> : <RepApp />}
        </div>
      </div>
    </AppCtx.Provider>
  );
}
