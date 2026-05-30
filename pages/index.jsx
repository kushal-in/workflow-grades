import { useState, useEffect } from "react";
import Head from "next/head";

const GRADE_POINTS = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, U: 0 };

function calcCG(courses) {
  const eligible = courses.filter(c => parseFloat(c.credit) > 0 && GRADE_POINTS[c.grade] !== undefined);
  const totalCredits = eligible.reduce((s, c) => s + parseFloat(c.credit), 0);
  const totalPoints  = eligible.reduce((s, c) => s + GRADE_POINTS[c.grade] * parseFloat(c.credit), 0);
  return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;
}

function groupBySemester(grades) {
  const map = {};
  grades.forEach(g => {
    const sem = g.semester || "?";
    if (!map[sem]) map[sem] = [];
    map[sem].push(g);
  });
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
}

const GRADE_STYLE = {
  S: { bg: "#e8f5e9", color: "#2e7d32" },
  A: { bg: "#e3f2fd", color: "#1565c0" },
  B: { bg: "#e8f5e9", color: "#388e3c" },
  C: { bg: "#fff3e0", color: "#e65100" },
  D: { bg: "#fce4ec", color: "#c62828" },
  E: { bg: "#fce4ec", color: "#b71c1c" },
  U: { bg: "#f3e5f5", color: "#6a1b9a" },
};

export default function Home() {
  const [creds, setCreds]   = useState({ username: "", password: "" });
  const [grades, setGrades] = useState(null);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchGrades = async () => {
    setLoad(true);
    setError("");
    setGrades(null);
    try {
      const res  = await fetch("/api/grades", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(creds),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setGrades(data.grades);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoad(false);
    }
  };

  const logout = () => {
    setGrades(null);
    setCreds({ username: "", password: "" });
    setError("");
  };

  const overallCG = grades ? calcCG(grades) : null;
  const semesters = grades ? groupBySemester(grades) : [];

  return (
    <>
      <Head>
        <title>Workflow Grades</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@500&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.page}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerInner}>
            <div style={s.brand}>
              <div style={s.brandDot} />
              <span style={s.brandName}>Workflow Grades</span>
            </div>
            {grades && (
              <button style={s.logoutBtn} onClick={logout}>
                Sign out
              </button>
            )}
          </div>
        </div>

        {!grades ? (
          /* ── LOGIN ── */
          <div style={s.loginWrap}>
            <div style={mounted ? { ...s.loginCard, opacity: 1, transform: "translateY(0)" } : { ...s.loginCard, opacity: 0, transform: "translateY(16px)" }}>
              <p style={s.loginEyebrow}>IITM Student Portal</p>
              <h1 style={s.loginTitle}>View your grades</h1>
              <p style={s.loginSub}>Sign in with your LDAP credentials. Nothing is stored.</p>

              <div style={s.fieldGroup}>
                <label style={s.label}>Roll number</label>
                <input
                  style={s.input}
                  placeholder="e.g. da25b054"
                  value={creds.username}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  onChange={(e) => setCreds(p => ({ ...p, username: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && fetchGrades()}
                />
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Password</label>
                <input
                  style={s.input}
                  type="password"
                  placeholder="LDAP password"
                  value={creds.password}
                  onChange={(e) => setCreds(p => ({ ...p, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && fetchGrades()}
                />
              </div>

              <button
                style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
                onClick={fetchGrades}
                disabled={loading}
              >
                {loading ? (
                  <span style={s.btnInner}>
                    <span style={s.spinner} /> Fetching grades…
                  </span>
                ) : "View Grades →"}
              </button>

              {error && <p style={s.errMsg}>{error}</p>}

              <div style={s.securityNote}>
                Your credentials are used only to authenticate with Workflow and the IITM proxy — they are never logged, stored, or sent anywhere else.
              </div>
            </div>
          </div>
        ) : (
          /* ── GRADES ── */
          <div style={s.gradesWrap}>

            {/* Overall CG banner */}
            {overallCG && (
              <div style={s.cgBanner}>
                <div style={s.cgBannerInner}>
                  <div>
                    <p style={s.cgLabel}>Cumulative Grade Point</p>
                    <p style={s.cgSub}>{grades.length} courses across {semesters.length} semesters</p>
                  </div>
                  <div style={s.cgValue}>{overallCG}</div>
                </div>
              </div>
            )}

            {/* Semester sections */}
            {semesters.map(([sem, courses]) => {
              const semCG = calcCG(courses);
              return (
                <div key={sem} style={s.semSection}>
                  <div style={s.semHeader}>
                    <span style={s.semTitle}>Semester {sem}</span>
                    {semCG && <span style={s.semCG}>CG {semCG}</span>}
                  </div>

                  {/* Mobile cards */}
                  <div style={s.mobileCards} data-mobile="">
                    {courses.map((g, i) => {
                      const gs = GRADE_STYLE[g.grade] || { bg: "#f5f5f5", color: "#555" };
                      return (
                        <div key={i} style={s.gradeCard}>
                          <div style={s.cardLeft}>
                            <span style={s.cardCode}>{g.courseNo}</span>
                            <span style={s.cardName}>{g.courseName}</span>
                            <span style={s.cardMeta}>{g.type} · {g.credit} cr · {g.attendance}</span>
                          </div>
                          <div style={{ ...s.gradePill, background: gs.bg, color: gs.color }}>
                            {g.grade || "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div style={s.tableWrap} data-desktop="">
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {["Course No", "Course Name", "Category", "Type", "Credits", "Grade", "Attendance"].map(c => (
                            <th key={c} style={s.th}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((g, i) => {
                          const gs = GRADE_STYLE[g.grade] || { bg: "#f5f5f5", color: "#555" };
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                              <td style={{ ...s.td, fontFamily: "DM Mono, monospace", fontSize: 12 }}>{g.courseNo}</td>
                              <td style={s.td}>{g.courseName}</td>
                              <td style={s.td}>{g.category}</td>
                              <td style={s.td}>{g.type}</td>
                              <td style={{ ...s.td, textAlign: "center" }}>{g.credit}</td>
                              <td style={{ ...s.td, textAlign: "center" }}>
                                <span style={{ ...s.gradePill, background: gs.bg, color: gs.color, fontSize: 12 }}>
                                  {g.grade || "—"}
                                </span>
                              </td>
                              <td style={{ ...s.td, textAlign: "center" }}>{g.attendance}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f5f0; font-family: 'DM Sans', sans-serif; }
        .mobile-only { display: none; }
        .desktop-only { display: block; }
        @media (max-width: 680px) {
          [data-mobile]  { display: flex !important; flex-direction: column; }
          [data-desktop] { display: none !important; }
        }
        @media (min-width: 681px) {
          [data-mobile]  { display: none !important; }
          [data-desktop] { display: block !important; }
        }
        input:focus { outline: none; border-color: #1a1a2e !important; box-shadow: 0 0 0 3px rgba(26,26,46,0.08); }
        button:hover { opacity: 0.85; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </>
  );
}

const s = {
  page:        { minHeight: "100vh" },

  header:      { background: "#fff", borderBottom: "1px solid #ebebeb", position: "sticky", top: 0, zIndex: 10 },
  headerInner: { maxWidth: 900, margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  brand:       { display: "flex", alignItems: "center", gap: 8 },
  brandDot:    { width: 8, height: 8, borderRadius: "50%", background: "#1a1a2e" },
  brandName:   { fontSize: 15, fontWeight: 600, color: "#1a1a2e", letterSpacing: "-0.2px" },
  logoutBtn:   { fontSize: 13, color: "#888", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" },

  loginWrap:   { display: "flex", justifyContent: "center", padding: "60px 20px" },
  loginCard:   { width: "100%", maxWidth: 400, transition: "opacity 0.4s, transform 0.4s" },
  loginEyebrow:{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#aaa", textTransform: "uppercase", marginBottom: 10 },
  loginTitle:  { fontSize: 28, fontWeight: 600, color: "#1a1a2e", letterSpacing: "-0.5px", marginBottom: 8 },
  loginSub:    { fontSize: 14, color: "#888", marginBottom: 28, lineHeight: 1.5 },

  fieldGroup:  { marginBottom: 14 },
  label:       { display: "block", fontSize: 12, fontWeight: 500, color: "#555", marginBottom: 6, letterSpacing: "0.02em" },
  input:       { display: "block", width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e8e8e8", borderRadius: 10, color: "#1a1a2e", background: "#fff", transition: "border-color 0.15s, box-shadow 0.15s" },

  btn:         { width: "100%", padding: "13px 0", fontSize: 14, fontWeight: 600, background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", marginTop: 8, transition: "opacity 0.15s", letterSpacing: "0.01em" },
  btnInner:    { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  spinner:     { width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  errMsg:      { color: "#c62828", fontSize: 13, marginTop: 12 },

  securityNote:{ marginTop: 24, padding: "14px 16px", background: "#fafafa", borderRadius: 10, fontSize: 12, color: "#999", lineHeight: 1.6, borderLeft: "3px solid #e8e8e8" },

  gradesWrap:  { maxWidth: 900, margin: "0 auto", padding: "24px 20px 48px" },

  cgBanner:    { background: "#1a1a2e", borderRadius: 14, padding: "20px 24px", marginBottom: 28 },
  cgBannerInner:{ display: "flex", justifyContent: "space-between", alignItems: "center" },
  cgLabel:     { fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 3 },
  cgSub:       { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  cgValue:     { fontSize: 42, fontWeight: 600, color: "#fff", letterSpacing: "-1px", fontFamily: "'DM Mono', monospace" },

  semSection:  { marginBottom: 28 },
  semHeader:   { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  semTitle:    { fontSize: 13, fontWeight: 600, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" },
  semCG:       { fontSize: 13, fontWeight: 600, color: "#1a1a2e", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 20, padding: "3px 10px" },

  mobileCards: { display: "none" },
  gradeCard:   { background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardLeft:    { display: "flex", flexDirection: "column", gap: 3, flex: 1, marginRight: 12 },
  cardCode:    { fontSize: 11, fontWeight: 600, color: "#aaa", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" },
  cardName:    { fontSize: 14, fontWeight: 500, color: "#1a1a2e" },
  cardMeta:    { fontSize: 11, color: "#bbb" },
  gradePill:   { fontSize: 14, fontWeight: 700, borderRadius: 8, padding: "6px 12px", minWidth: 40, textAlign: "center", flexShrink: 0 },

  tableWrap:   { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  table:       { borderCollapse: "collapse", width: "100%", fontSize: 13 },
  th:          { background: "#fafafa", color: "#888", padding: "10px 14px", textAlign: "left", fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #f0f0f0" },
  td:          { padding: "11px 14px", borderBottom: "1px solid #f5f5f5", color: "#1a1a2e" },
};