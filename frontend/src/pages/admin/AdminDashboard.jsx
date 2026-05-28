import { useEffect, useMemo, useState } from "react";
import {
  adminAnalyzePapers,
  adminCreatePaper,
  adminDeletePaper,
  adminDeleteAiData,
  adminStats,
  adminUpdatePaper,
  listPapers,
} from "../../lib/api.js";
import { getToken } from "../../lib/auth.js";

const examTypes = ["Mid", "Model", "Semester"];

function emptyForm() {
  return {
    subjectName: "",
    department: "",
    academicYear: "",
    semester: "",
    examType: "Semester",
  };
}

export default function AdminDashboard({ setToast }) {
  const token = useMemo(() => getToken(), []);
  const [stats, setStats] = useState({ totalUploads: 0, totalDownloads: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiWorking, setAiWorking] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [aiFilters, setAiFilters] = useState({
    subjectName: "",
    department: "",
    semester: "",
    examType: "",
  });
  const [q, setQ] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        adminStats(token),
        listPapers({ search: q, sort: "recent", page: 1, limit: 25 }),
      ]);
      setStats(s);
      setItems(list.items || []);
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAiAnalysis() {
    setAiWorking(true);
    setAiMsg("");
    try {
      const filters = {};
      Object.entries(aiFilters).forEach(([k, v]) => {
        if (!v) return;
        filters[k] = v;
      });
      const res = await adminAnalyzePapers({ token, filters });
      setAiMsg(
        `Analyzed ${res.papersAnalyzed} paper(s), inserted ${res.questionsInserted} new question(s). Generated: ${new Date(
          res.generatedAt
        ).toLocaleString()}`
      );
      setToast("AI analysis completed");
    } catch (e) {
      setToast(e.message);
    } finally {
      setAiWorking(false);
    }
  }

  async function deleteAiData() {
    if (!aiFilters.subjectName) {
      setToast("Enter a Subject Name to delete AI data");
      return;
    }
    const ok = window.confirm(`Delete extracted AI data for subject "${aiFilters.subjectName}"?`);
    if (!ok) return;
    setAiWorking(true);
    setAiMsg("");
    try {
      const res = await adminDeleteAiData({ token, subject: aiFilters.subjectName });
      setAiMsg(
        `Deleted extracted_questions: ${res.deleted?.extracted_questions || 0}, predictions: ${
          res.deleted?.predictions || 0
        }`
      );
      setToast("AI data deleted");
    } catch (e) {
      setToast(e.message);
    } finally {
      setAiWorking(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(p) {
    setEditingId(p._id);
    setForm({
      subjectName: p.subjectName,
      department: p.department,
      academicYear: p.academicYear,
      semester: p.semester,
      examType: p.examType,
    });
    setFile(null);
  }

  async function submit() {
    if (!form.subjectName || !form.department || !form.academicYear || !form.semester) {
      setToast("Fill all fields");
      return;
    }
    if (!editingId && !file) {
      setToast("Select a PDF file");
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await adminUpdatePaper({ token, id: editingId, metadata: form, file });
        setToast("Updated");
      } else {
        await adminCreatePaper({ token, metadata: form, file });
        setToast("Uploaded");
      }
      setForm(emptyForm());
      setFile(null);
      setEditingId("");
      await refresh();
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: "22px 0 30px" }}>
      <div className="grid dashCards">
        <div className="card dashCard">
          <div className="muted">Total uploads</div>
          <div style={{ color: "var(--text-h)", fontWeight: 750, fontSize: 26 }}>
            {stats.totalUploads}
          </div>
        </div>
        <div className="card dashCard">
          <div className="muted">Total downloads</div>
          <div style={{ color: "var(--text-h)", fontWeight: 750, fontSize: 26 }}>
            {stats.totalDownloads}
          </div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, color: "var(--text-h)" }}>AI Prediction Module (Admin)</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Run analysis after new uploads. Filters are optional (blank = analyze all).
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 10 }}>
          <input
            className="input"
            placeholder="Subject Name (optional)"
            value={aiFilters.subjectName}
            onChange={(e) => setAiFilters({ ...aiFilters, subjectName: e.target.value })}
          />
          <input
            className="input"
            placeholder="Department (optional)"
            value={aiFilters.department}
            onChange={(e) => setAiFilters({ ...aiFilters, department: e.target.value })}
          />
          <input
            className="input"
            placeholder="Semester (optional)"
            value={aiFilters.semester}
            onChange={(e) => setAiFilters({ ...aiFilters, semester: e.target.value })}
          />
          <select
            className="select"
            value={aiFilters.examType}
            onChange={(e) => setAiFilters({ ...aiFilters, examType: e.target.value })}
          >
            <option value="">All exam types</option>
            {examTypes.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn primary" type="button" disabled={aiWorking} onClick={runAiAnalysis}>
            {aiWorking ? "Working…" : "Re-run AI analysis"}
          </button>
          <button className="btn danger" type="button" disabled={aiWorking} onClick={deleteAiData}>
            Delete extracted AI data (by subject)
          </button>
          {aiMsg ? (
            <div className="muted" style={{ fontSize: 13 }}>
              {aiMsg}
            </div>
          ) : null}
        </div>
      </section>

      <div style={{ height: 14 }} />

      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <h2 style={{ margin: 0, color: "var(--text-h)" }}>
            {editingId ? "Edit paper" : "Upload new paper"}
          </h2>
          {editingId ? (
            <button
              className="btn"
              type="button"
              onClick={() => {
                setEditingId("");
                setForm(emptyForm());
                setFile(null);
                setToast("Edit cancelled");
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 10 }}>
          <input
            className="input"
            placeholder="Subject Name"
            value={form.subjectName}
            onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
          />
          <input
            className="input"
            placeholder="Department / Branch"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <input
            className="input"
            placeholder="Academic Year (e.g., 2024-2025)"
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
          />
          <input
            className="input"
            placeholder="Semester (e.g., 4)"
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
          />
          <select
            className="select"
            value={form.examType}
            onChange={(e) => setForm({ ...form, examType: e.target.value })}
          >
            {examTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ maxWidth: 420 }}
          />
          <button className="btn primary" type="button" disabled={loading} onClick={submit}>
            {loading ? "Working…" : editingId ? "Save changes" : "Upload PDF"}
          </button>
          <div className="muted" style={{ fontSize: 13 }}>
            {file ? `Selected: ${file.name}` : editingId ? "Optional: choose a new PDF to replace" : "Choose a PDF"}
          </div>
        </div>
      </section>

      <div style={{ height: 14 }} />

      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, color: "var(--text-h)" }}>Manage papers</h2>
          <input
            className="input"
            placeholder="Search in uploads…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ maxWidth: 380 }}
          />
          <button className="btn" type="button" disabled={loading} onClick={refresh}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Dept</th>
                <th>Year</th>
                <th>Sem</th>
                <th>Type</th>
                <th>Downloads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id}>
                  <td style={{ color: "var(--text-h)", fontWeight: 600 }}>{p.subjectName}</td>
                  <td>{p.department}</td>
                  <td>{p.academicYear}</td>
                  <td>{p.semester}</td>
                  <td>{p.examType}</td>
                  <td>{p.downloads || 0}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a className="btn" href={p.fileUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                      <button className="btn" type="button" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={async () => {
                          const ok = window.confirm("Delete this paper?");
                          if (!ok) return;
                          try {
                            setLoading(true);
                            await adminDeletePaper({ token, id: p._id });
                            setToast("Deleted");
                            await refresh();
                          } catch (e) {
                            setToast(e.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan="7" className="muted">
                    No uploads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

