import { useEffect, useMemo, useState } from "react";
import { papersMetaDistinct, predictQuestions } from "../lib/api.js";

const examTypes = ["", "Mid", "Model", "Semester"];

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem("qp_bookmarks") || "[]");
  } catch {
    return [];
  }
}

function saveBookmarks(items) {
  localStorage.setItem("qp_bookmarks", JSON.stringify(items));
}

export default function Predict({ setToast }) {
  const [meta, setMeta] = useState({ subjects: [], departments: [], semesters: [], academicYears: [] });
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [examType, setExamType] = useState("");
  const [subject, setSubject] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState(() => loadBookmarks());

  const bookmarkSet = useMemo(() => new Set(bookmarks.map((b) => b.normalized)), [bookmarks]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMeta(true);
    papersMetaDistinct()
      .then((m) => {
        if (cancelled) return;
        setMeta(m);
        if (!subject && m.subjects?.length) setSubject(m.subjects[0]);
        if (!department && m.departments?.length) setDepartment(m.departments[0]);
        if (!semester && m.semesters?.length) setSemester(m.semesters[0]);
      })
      .catch((e) => setToast(e.message))
      .finally(() => {
        if (cancelled) return;
        setLoadingMeta(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleBookmark(item) {
    const key = item.normalized;
    const next = bookmarkSet.has(key)
      ? bookmarks.filter((b) => b.normalized !== key)
      : [{ normalized: key, question: item.question, confidence: item.confidence }, ...bookmarks].slice(0, 200);
    setBookmarks(next);
    saveBookmarks(next);
  }

  const filteredImportant = useMemo(() => {
    const items = (result?.predictedImportant || []).slice();
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter((x) => String(x.question || "").toLowerCase().includes(s));
  }, [result, search]);

  async function run() {
    if (!subject) {
      setToast("Select a subject");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      let res;
      try {
        res = await predictQuestions({ subject, department, semester, examType });
      } catch (e) {
        // If strict examType has no stored prediction yet, retry with "All exam types".
        if (e?.status === 404 && examType) {
          res = await predictQuestions({ subject, department, semester, examType: "" });
          setToast(`No prediction for ${examType}; showing latest available result`);
        } else {
          throw e;
        }
      }
      setResult(res);
      setToast("Prediction ready");
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: "22px 0 30px" }}>
      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ margin: 0, color: "var(--text-h)" }}>AI Question Prediction</h2>
        <div className="muted" style={{ marginTop: 6 }}>
          Select filters and click predict. If you see “No predictions yet”, ask admin to run analysis.
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Department
            </div>
            <select className="select" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {loadingMeta ? <option value="">Loading…</option> : null}
              <option value="">All</option>
              {(meta.departments || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Semester
            </div>
            <select className="select" value={semester} onChange={(e) => setSemester(e.target.value)}>
              {loadingMeta ? <option value="">Loading…</option> : null}
              <option value="">All</option>
              {(meta.semesters || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Exam Type
            </div>
            <select className="select" value={examType} onChange={(e) => setExamType(e.target.value)}>
              {examTypes.map((t) => (
                <option key={t || "all"} value={t}>
                  {t || "All"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Subject
            </div>
            <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {loadingMeta ? <option value="">Loading…</option> : null}
              {(meta.subjects || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          <button className="btn primary" type="button" disabled={loading} onClick={run}>
            {loading ? "Predicting…" : "Predict Questions"}
          </button>
          <a
            className="btn"
            href={
              subject
                ? `/api/predict/${encodeURIComponent(subject)}/export.pdf?department=${encodeURIComponent(
                    department || ""
                  )}&semester=${encodeURIComponent(semester || "")}&examType=${encodeURIComponent(examType || "")}`
                : "#"
            }
            onClick={(e) => {
              if (!subject) {
                e.preventDefault();
                setToast("Select a subject first");
              }
            }}
          >
            Export PDF
          </a>
          <input
            className="input"
            placeholder="Search predicted questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 420, flex: "1 1 320px" }}
          />
          <button
            className="btn"
            type="button"
            onClick={() => {
              setBookmarks([]);
              saveBookmarks([]);
              setToast("Bookmarks cleared");
            }}
          >
            Clear bookmarks
          </button>
        </div>

        {result?.generatedAt ? (
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            Last analyzed: {new Date(result.generatedAt).toLocaleString()}
          </div>
        ) : null}
      </section>

      <div style={{ height: 14 }} />

      <section className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: 0, color: "var(--text-h)" }}>Predicted Important Questions</h3>
          <div className="muted" style={{ marginTop: 6 }}>
            Showing {filteredImportant.length} item(s)
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {filteredImportant.map((it) => (
              <div key={it.normalized} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 650, color: "var(--text-h)" }}>{it.question}</div>
                  <div style={{ whiteSpace: "nowrap", fontWeight: 750 }}>{it.confidence}%</div>
                </div>
                <div className="muted" style={{ marginTop: 6, fontSize: 13, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="tag">Freq: {it.frequency}</span>
                  {it.marksBucket ? <span className="tag">{it.marksBucket}-mark</span> : null}
                  {it.unit ? <span className="tag">{it.unit}</span> : null}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" type="button" onClick={() => toggleBookmark(it)}>
                    {bookmarkSet.has(it.normalized) ? "Bookmarked" : "Bookmark"}
                  </button>
                </div>
              </div>
            ))}
            {!result ? <div className="muted">No prediction loaded yet.</div> : null}
            {result && !filteredImportant.length ? <div className="muted">No matches.</div> : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ margin: 0, color: "var(--text-h)" }}>Top 10 (2-mark)</h3>
            <ol style={{ marginTop: 10, paddingLeft: 18 }}>
              {(result?.top2Mark || []).map((x) => (
                <li key={x.normalized} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{x.question}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {x.confidence}% • freq {x.frequency}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ margin: 0, color: "var(--text-h)" }}>Top 10 (10-mark)</h3>
            <ol style={{ marginTop: 10, paddingLeft: 18 }}>
              {(result?.top10Mark || []).map((x) => (
                <li key={x.normalized} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{x.question}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {x.confidence}% • freq {x.frequency}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ margin: 0, color: "var(--text-h)" }}>Bookmarks</h3>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {bookmarks.slice(0, 15).map((b) => (
                <div key={b.normalized} className="card" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{b.question}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {b.confidence}% (saved)
                  </div>
                </div>
              ))}
              {!bookmarks.length ? <div className="muted">No bookmarks yet.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

