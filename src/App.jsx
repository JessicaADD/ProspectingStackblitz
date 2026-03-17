import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://xlddlwqfqldnqwdbuiie.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZGRsd3FmcWxkbnF3ZGJ1aWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTYxNDIsImV4cCI6MjA4OTMzMjE0Mn0.4NHR2nhet-StNgX94w55IFOJBITo3JGA6fUXYK1xJVo";

const api = async (path, options = {}, token = null) => {
  const headers = { "Content-Type": "application/json", "apikey": SUPABASE_KEY };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.prefer) headers["Prefer"] = options.prefer;
  const { prefer, ...fetchOptions } = options;
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...fetchOptions, headers });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.message || JSON.stringify(data));
  return data;
};

const authApi = async (body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Invalid credentials");
  return data;
};

const parseFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split(/[\n,;\r]+/).map(l => l.trim().replace(/^["']|["']$/g, "")).filter(l => l && l.includes(".") && !l.toLowerCase().includes("website") && !l.toLowerCase().includes("url") && !l.toLowerCase().includes("domain"));
    resolve(lines);
  };
  reader.onerror = reject;
  reader.readAsText(file);
});

// Icons
const Ico = ({ d, s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const COLORS = {
  bg: "#0f1117", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)",
  text: "#e2e8f0", muted: "#64748b", purple: "#a78bfa", green: "#34d399",
  blue: "#60a5fa", red: "#fb7185"
};

const Badge = ({ children, color = "#a78bfa", bg = "rgba(102,126,234,0.15)" }) => (
  <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap" }}>{children}</span>
);

const Btn = ({ children, onClick, disabled, variant = "primary", style: extra = {} }) => {
  const styles = {
    primary: { background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff" },
    success: { background: "linear-gradient(135deg,#11998e,#38ef7d)", color: "#fff" },
    ghost: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" },
    danger: { background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff6b6b" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, ...styles[variant], ...extra }}>
      {children}
    </button>
  );
};

const Checkbox = ({ checked, onChange, color = "#60a5fa", readonly = false }) => (
  <div onClick={readonly ? undefined : onChange}
    style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${checked ? color : "rgba(255,255,255,0.2)"}`, background: checked ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: readonly ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>
    {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
  </div>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password"); return; }
    setLoading(true); setError("");
    try {
      const data = await authApi({ email, password });
      const profiles = await api(`/rest/v1/profiles?id=eq.${data.user.id}&select=*`, { method: "GET" }, data.access_token);
      if (!profiles?.[0]) throw new Error("Profile not found");
      onLogin({ token: data.access_token, user: data.user, profile: profiles[0] });
    } catch (err) { setError(err.message || "Login failed"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "48px 40px", width: 340 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#667eea,#764ba2)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>🎯</div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: 0 }}>Prospecting</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "6px 0 0" }}>Sign in to your account</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        {error && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: 13, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ name, role, onLogout }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${COLORS.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🎯</span>
        <span style={{ fontWeight: 700, fontSize: 17, color: COLORS.text }}>Prospecting</span>
        <Badge color="#fff" bg={role === "manager" ? "linear-gradient(135deg,#667eea,#764ba2)" : "linear-gradient(135deg,#11998e,#38ef7d)"}>{role.toUpperCase()}</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Hi, {name}</span>
        <Btn onClick={onLogout} variant="ghost"><Ico d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /> Logout</Btn>
      </div>
    </div>
  );
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────
function UploadModal({ token, onClose }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [state, setState] = useState("");
  const [urls, setUrls] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const lines = await parseFile(file);
    setUrls(lines);
  };

  const handleSubmit = async () => {
    if (!name || !provider || !state || urls.length === 0) { setError("Fill all fields and upload a file."); return; }
    setLoading(true);
    try {
      const listRes = await api("/rest/v1/lists?select=*", { method: "POST", prefer: "return=representation", body: JSON.stringify({ name, provider, state }) }, token);
      const listId = listRes[0].id;
      const rows = urls.map((url, i) => ({ list_id: listId, url, position: i + 1 }));
      for (let i = 0; i < rows.length; i += 100) {
        await api("/rest/v1/websites", { method: "POST", body: JSON.stringify(rows.slice(i, i + 100)) }, token);
      }
      onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "#1a1f2e", border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 32, width: 460, maxWidth: "90vw" }}>
        <h2 style={{ margin: "0 0 22px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Upload New List</h2>
        {[["List Name", name, setName, "e.g. Florida Dentists Q1"], ["Provider", provider, setProvider, "e.g. ZoomInfo"], ["State", state, setState, "e.g. Florida"]].map(([lbl, val, set, ph]) => (
          <div key={lbl} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, color: COLORS.muted, marginBottom: 5 }}>{lbl}</label>
            <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
              style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14, boxSizing: "border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, color: COLORS.muted, marginBottom: 5 }}>CSV / XLSX File</label>
          <label style={{ display: "block", padding: 18, background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 8, textAlign: "center", cursor: "pointer" }}>
            <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
            <div style={{ color: COLORS.muted, fontSize: 14 }}>{fileName || "Click to upload CSV"}</div>
            {urls.length > 0 && <div style={{ color: COLORS.green, fontSize: 13, marginTop: 5 }}>✓ {urls.length} websites detected</div>}
          </label>
        </div>
        {error && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading} variant="success">{loading ? "Uploading..." : "Upload List"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── LIST DETAIL (Manager) ────────────────────────────────────────────────────
function ListDetail({ list, reps, token, onBack }) {
  const [websites, setWebsites] = useState([]);
  const [progress, setProgress] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignRep, setAssignRep] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [ws, prog, asgn] = await Promise.all([
      api(`/rest/v1/websites?list_id=eq.${list.id}&order=position.asc&select=*`, { method: "GET" }, token),
      api(`/rest/v1/progress?select=*`, { method: "GET" }, token),
      api(`/rest/v1/assignments?list_id=eq.${list.id}&select=*,profiles(full_name,id)`, { method: "GET" }, token)
    ]);
    setWebsites(ws || []);
    setProgress(prog || []);
    setAssignments(asgn || []);
    setLoading(false);
  }, [list.id, token]);

  useEffect(() => { load(); }, [load]);

  const assign = async () => {
    if (!assignRep) return;
    try { await api("/rest/v1/assignments", { method: "POST", body: JSON.stringify({ list_id: list.id, rep_id: assignRep }) }, token); }
    catch {}
    setAssignRep(""); load();
  };

  const unassign = async (repId) => {
    await api(`/rest/v1/assignments?list_id=eq.${list.id}&rep_id=eq.${repId}`, { method: "DELETE" }, token);
    load();
  };

  const wsIds = new Set(websites.map(w => w.id));
  const assignedIds = assignments.map(a => a.rep_id);
  const unassignedReps = reps.filter(r => !assignedIds.includes(r.id));

  const repStats = (repId) => {
    const rp = progress.filter(p => p.rep_id === repId && wsIds.has(p.website_id));
    return { v: rp.filter(p => p.visited).length, c: rp.filter(p => p.claimed).length, n: rp.filter(p => p.not_open).length };
  };

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, marginBottom: 18, padding: 0 }}>
        <Ico d="M19 12H5M12 19l-7-7 7-7" /> Back to Lists
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: COLORS.text }}>{list.name}</h2>
        <Badge>{list.provider}</Badge>
        <Badge color={COLORS.muted} bg="rgba(255,255,255,0.06)">{list.state}</Badge>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13, margin: "0 0 22px" }}>{websites.length} websites</p>

      {/* Assignments */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 22 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: COLORS.text }}>Assigned Reps</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: assignments.length ? 14 : 0 }}>
          {assignments.length === 0 && <span style={{ color: "#475569", fontSize: 13 }}>No reps assigned</span>}
          {assignments.map(a => {
            const s = repStats(a.rep_id);
            return (
              <div key={a.rep_id} style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", minWidth: 170 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontWeight: 600, color: COLORS.green, fontSize: 14 }}>{a.profiles?.full_name}</span>
                  <button onClick={() => unassign(a.rep_id)} style={{ background: "rgba(255,80,80,0.15)", border: "none", borderRadius: 4, color: "#ff6b6b", cursor: "pointer", padding: "2px 7px", fontSize: 11 }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: COLORS.muted }}>
                  <span>👁 {s.v}/{websites.length}</span><span>✅ {s.c}</span><span>🚫 {s.n}</span>
                </div>
              </div>
            );
          })}
        </div>
        {unassignedReps.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <select value={assignRep} onChange={e => setAssignRep(e.target.value)}
              style={{ padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13 }}>
              <option value="">Select rep...</option>
              {unassignedReps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
            <Btn onClick={assign} disabled={!assignRep}>Assign</Btn>
          </div>
        )}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: COLORS.muted }}>Loading...</div> : (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                {["#", "Website", ...assignments.map(a => a.profiles?.full_name)].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: h === "#" || h === "Website" ? "left" : "center", fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {websites.map((w, i) => (
                <tr key={w.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "10px 14px", color: "#475569", fontSize: 12, width: 40 }}>{i + 1}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <a href={w.url.startsWith("http") ? w.url : `https://${w.url}`} target="_blank" rel="noreferrer" style={{ color: COLORS.blue, fontSize: 13, textDecoration: "none" }}>{w.url}</a>
                  </td>
                  {assignments.map(a => {
                    const p = progress.find(p => p.website_id === w.id && p.rep_id === a.rep_id);
                    return (
                      <td key={a.rep_id} style={{ padding: "10px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, fontSize: 14 }}>
                          <span title="Visited">{p?.visited ? "👁" : "—"}</span>
                          <span title="Claimed">{p?.claimed ? "✅" : "—"}</span>
                          <span title="Not Open">{p?.not_open ? "🚫" : "—"}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── REP OVERVIEW ─────────────────────────────────────────────────────────────
function RepOverview({ reps, lists, token }) {
  const [prog, setProg] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/rest/v1/progress?select=*", { method: "GET" }, token).then(d => { setProg(d || []); setLoading(false); });
  }, [token]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: COLORS.muted }}>Loading...</div>;

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.04)" }}>
            {["Rep", "Lists Assigned", "Visited", "Claimed", "Not Open"].map(h => (
              <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reps.map((rep, i) => {
            const rp = prog.filter(p => p.rep_id === rep.id);
            const assigned = lists.filter(l => l.assignments?.some(a => a.rep_id === rep.id)).length;
            return (
              <tr key={rep.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <td style={{ padding: "13px 16px", fontWeight: 600, color: COLORS.text }}>{rep.full_name}</td>
                <td style={{ padding: "13px 16px", color: COLORS.muted }}>{assigned}</td>
                <td style={{ padding: "13px 16px" }}><Badge color={COLORS.blue} bg="rgba(96,165,250,0.12)">{rp.filter(p => p.visited).length}</Badge></td>
                <td style={{ padding: "13px 16px" }}><Badge color={COLORS.green} bg="rgba(52,211,153,0.12)">{rp.filter(p => p.claimed).length}</Badge></td>
                <td style={{ padding: "13px 16px" }}><Badge color={COLORS.red} bg="rgba(251,113,133,0.12)">{rp.filter(p => p.not_open).length}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MANAGER APP ──────────────────────────────────────────────────────────────
function ManagerApp({ session, onLogout }) {
  const [view, setView] = useState("lists");
  const [lists, setLists] = useState([]);
  const [reps, setReps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [fProv, setFProv] = useState(""); const [fState, setFState] = useState("");
  const [loading, setLoading] = useState(true);
  const token = session.token;

  const load = useCallback(async () => {
    setLoading(true);
    const [ls, rs] = await Promise.all([
      api("/rest/v1/lists?select=*,assignments(rep_id,profiles(full_name))&order=created_at.desc", { method: "GET" }, token),
      api("/rest/v1/profiles?role=eq.rep&select=*&order=full_name.asc", { method: "GET" }, token)
    ]);
    setLists(ls || []); setReps(rs || []); setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const providers = [...new Set(lists.map(l => l.provider))].filter(Boolean);
  const states = [...new Set(lists.map(l => l.state))].filter(Boolean);
  const filtered = lists.filter(l => (!fProv || l.provider === fProv) && (!fState || l.state === fState));

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Segoe UI',sans-serif", color: COLORS.text, display: "flex", flexDirection: "column" }}>
      <Header name={session.profile.full_name} role="manager" onLogout={onLogout} />
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box", flex: 1 }}>
        {selected ? (
          <ListDetail list={selected} reps={reps} token={token} onBack={() => { setSelected(null); load(); }} />
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
              {[["lists", "📋 Lists"], ["reps", "👥 Rep Overview"]].map(([id, lbl]) => (
                <button key={id} onClick={() => setView(id)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, background: view === id ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.06)", color: view === id ? "#fff" : "#94a3b8" }}>
                  {lbl}
                </button>
              ))}
              <Btn onClick={() => setShowUpload(true)} variant="success" style={{ marginLeft: "auto" }}>⬆ Upload List</Btn>
            </div>

            {view === "lists" && (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                  <select value={fProv} onChange={e => setFProv(e.target.value)} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13 }}>
                    <option value="">All Providers</option>
                    {providers.map(p => <option key={p}>{p}</option>)}
                  </select>
                  <select value={fState} onChange={e => setFState(e.target.value)} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 13 }}>
                    <option value="">All States</option>
                    {states.map(s => <option key={s}>{s}</option>)}
                  </select>
                  {(fProv || fState) && <Btn onClick={() => { setFProv(""); setFState(""); }} variant="danger">Clear</Btn>}
                </div>
                {loading ? <div style={{ padding: 60, textAlign: "center", color: COLORS.muted }}>Loading...</div> : (
                  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                          {["List Name", "Provider", "State", "Assigned To", "Actions"].map(h => (
                            <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#475569" }}>No lists yet — upload one to get started!</td></tr>
                        )}
                        {filtered.map((list, i) => (
                          <tr key={list.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                            <td style={{ padding: "13px 16px", fontWeight: 500 }}>{list.name}</td>
                            <td style={{ padding: "13px 16px" }}><Badge>{list.provider}</Badge></td>
                            <td style={{ padding: "13px 16px", color: COLORS.muted }}>{list.state}</td>
                            <td style={{ padding: "13px 16px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {list.assignments?.length > 0
                                  ? list.assignments.map(a => <Badge key={a.rep_id} color={COLORS.green} bg="rgba(16,185,129,0.12)">{a.profiles?.full_name}</Badge>)
                                  : <span style={{ color: "#475569", fontSize: 13 }}>Unassigned</span>}
                              </div>
                            </td>
                            <td style={{ padding: "13px 16px" }}>
                              <Btn onClick={() => setSelected(list)} variant="ghost" style={{ fontSize: 13, padding: "6px 12px" }}>Manage</Btn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            {view === "reps" && <RepOverview reps={reps} lists={lists} token={token} />}
          </>
        )}
      </div>
      {showUpload && <UploadModal token={token} onClose={() => { setShowUpload(false); load(); }} />}
    </div>
  );
}

// ─── REP LIST VIEW ────────────────────────────────────────────────────────────
function RepListView({ list, repId, token, onBack }) {
  const [websites, setWebsites] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [ws, prog] = await Promise.all([
      api(`/rest/v1/websites?list_id=eq.${list.id}&order=position.asc&select=*`, { method: "GET" }, token),
      api(`/rest/v1/progress?rep_id=eq.${repId}&select=*`, { method: "GET" }, token)
    ]);
    setWebsites(ws || []);
    const map = {};
    (prog || []).forEach(p => { map[p.website_id] = p; });
    setProgress(map);
    setLoading(false);
  }, [list.id, repId, token]);

  useEffect(() => { load(); }, [load]);

  const upsert = async (websiteId, field, value) => {
    const existing = progress[websiteId];
    const next = { ...existing, [field]: value, website_id: websiteId, rep_id: repId };
    setProgress(prev => ({ ...prev, [websiteId]: next }));
    try {
      if (existing?.id) {
        await api(`/rest/v1/progress?id=eq.${existing.id}`, { method: "PATCH", body: JSON.stringify({ [field]: value, updated_at: new Date().toISOString() }) }, token);
      } else {
        const res = await api("/rest/v1/progress?select=*", { method: "POST", prefer: "return=representation", body: JSON.stringify({ website_id: websiteId, rep_id: repId, [field]: value }) }, token);
        if (res?.[0]) setProgress(prev => ({ ...prev, [websiteId]: res[0] }));
      }
    } catch (err) { console.error(err); }
  };

  const visit = (w) => {
    window.open(w.url.startsWith("http") ? w.url : `https://${w.url}`, "_blank");
    if (!progress[w.id]?.visited) upsert(w.id, "visited", true);
  };

  const vals = Object.values(progress);
  const stats = [
    ["Total", websites.length, COLORS.muted, "rgba(255,255,255,0.05)"],
    ["Visited", vals.filter(p => p.visited).length, COLORS.blue, "rgba(96,165,250,0.1)"],
    ["Claimed", vals.filter(p => p.claimed).length, COLORS.green, "rgba(52,211,153,0.1)"],
    ["Not Open", vals.filter(p => p.not_open).length, COLORS.red, "rgba(251,113,133,0.1)"]
  ];

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, marginBottom: 18, padding: 0 }}>
        <Ico d="M19 12H5M12 19l-7-7 7-7" /> Back
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{list.name}</h2>
        <Badge>{list.provider}</Badge>
        <Badge color={COLORS.muted} bg="rgba(255,255,255,0.06)">{list.state}</Badge>
      </div>
      <div style={{ display: "flex", gap: 12, margin: "16px 0 22px", flexWrap: "wrap" }}>
        {stats.map(([lbl, val, color, bg]) => (
          <div key={lbl} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 10, padding: "11px 18px", minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>
      {loading ? <div style={{ padding: 40, textAlign: "center", color: COLORS.muted }}>Loading...</div> : (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", width: 36 }}>#</th>
                <th style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, color: COLORS.muted, textTransform: "uppercase" }}>Website</th>
                <th style={{ padding: "11px 14px", textAlign: "center", fontSize: 11, color: COLORS.blue, textTransform: "uppercase", width: 80 }}>Visited</th>
                <th style={{ padding: "11px 14px", textAlign: "center", fontSize: 11, color: COLORS.green, textTransform: "uppercase", width: 80 }}>Claimed</th>
                <th style={{ padding: "11px 14px", textAlign: "center", fontSize: 11, color: COLORS.red, textTransform: "uppercase", width: 90 }}>Not Open</th>
              </tr>
            </thead>
            <tbody>
              {websites.map((w, i) => {
                const p = progress[w.id] || {};
                return (
                  <tr key={w.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td style={{ padding: "11px 14px", color: "#475569", fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <button onClick={() => visit(w)} style={{ background: "none", border: "none", color: COLORS.blue, cursor: "pointer", fontSize: 14, padding: 0, textAlign: "left" }}>{w.url}</button>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      <Checkbox checked={!!p.visited} color={COLORS.blue} readonly />
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      <Checkbox checked={!!p.claimed} color={COLORS.green} onChange={() => upsert(w.id, "claimed", !p.claimed)} />
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      <Checkbox checked={!!p.not_open} color={COLORS.red} onChange={() => upsert(w.id, "not_open", !p.not_open)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── REP APP ──────────────────────────────────────────────────────────────────
function RepApp({ session, onLogout }) {
  const [lists, setLists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = session.token; const repId = session.user.id;

  useEffect(() => {
    api(`/rest/v1/assignments?rep_id=eq.${repId}&select=*,lists(*)`, { method: "GET" }, token)
      .then(d => { setLists((d || []).map(a => a.lists).filter(Boolean)); setLoading(false); });
  }, [repId, token]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Segoe UI',sans-serif", color: COLORS.text }}>
      <Header name={session.profile.full_name} role="rep" onLogout={onLogout} />
      <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        {selected ? (
          <RepListView list={selected} repId={repId} token={token} onBack={() => setSelected(null)} />
        ) : (
          <>
            <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 20 }}>My Assigned Lists</h2>
            {loading ? <div style={{ padding: 60, textAlign: "center", color: COLORS.muted }}>Loading...</div> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
                {lists.length === 0 && <div style={{ color: "#475569" }}>No lists assigned yet.</div>}
                {lists.map(list => (
                  <div key={list.id} onClick={() => setSelected(list)}
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(102,126,234,0.5)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>{list.name}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Badge>{list.provider}</Badge>
                      <Badge color={COLORS.muted} bg="rgba(255,255,255,0.06)">{list.state}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  if (!session) return <Login onLogin={setSession} />;
  if (session.profile?.role === "manager") return <ManagerApp session={session} onLogout={() => setSession(null)} />;
  return <RepApp session={session} onLogout={() => setSession(null)} />;
}