import { useEffect, useMemo, useState } from "react";
import { downloadPaper, listPapers } from "../lib/api.js";

const examTypes = ["", "Mid", "Model", "Semester"];

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

export default function Home({ setToast }) {
  const [search, setSearch] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [department, setDepartment] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [examType, setExamType] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 });

  const query = useMemo(
    () => ({
      search,
      subjectName,
      department,
      academicYear,
      semester,
      examType,
      sort,
      page,
      limit: 12,
    }),
    [search, subjectName, department, academicYear, semester, examType, sort, page]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPapers(query)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e) => setToast(e.message))
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, setToast]);

  const departments = unique(data.items.map((x) => x.department));
  const years = unique(data.items.map((x) => x.academicYear));
  const semesters = unique(data.items.map((x) => x.semester));

  return (
    <main className="container">
      <section className="heroWrap">
        <div className="hero">
          <div className="heroCard">
            <h1 className="heroTitle">Find previous year question papers fast.</h1>
            <p className="heroSub muted">
              Search by subject name, then filter by department, year, semester and exam type. Download
              PDFs instantly.
            </p>

            <div className="searchRow">
              <input
                className="input"
                placeholder="Search by subject (e.g., Data Structures)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  setPage(1);
                  setToast("Search updated");
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card filters">
        <div className="filtersGrid">
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Department
            </div>
            <select
              className="select"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Academic Year
            </div>
            <select
              className="select"
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Semester
            </div>
            <select
              className="select"
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {semesters.map((s) => (
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
            <select
              className="select"
              value={examType}
              onChange={(e) => {
                setExamType(e.target.value);
                setPage(1);
              }}
            >
              {examTypes.map((t) => (
                <option key={t || "all"} value={t}>
                  {t || "All"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Sort
            </div>
            <select
              className="select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="recent">Recently added</option>
              <option value="downloads">Most downloaded</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Subject (exact match)
            </div>
            <input
              className="input"
              placeholder="Subject Name filter"
              value={subjectName}
              onChange={(e) => {
                setSubjectName(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Clear
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setSearch("");
                setSubjectName("");
                setDepartment("");
                setAcademicYear("");
                setSemester("");
                setExamType("");
                setSort("recent");
                setPage(1);
                setToast("Filters cleared");
              }}
              style={{ width: "100%" }}
            >
              Reset filters
            </button>
          </div>
        </div>
      </section>

      <section className="resultsHeader">
        <div className="muted">
          {loading ? "Loading…" : `${data.total} paper(s) found`} • Page {data.page} of{" "}
          {data.totalPages}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>
          <button
            className="btn"
            type="button"
            disabled={page >= (data.totalPages || 1)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </section>

      <section className="grid paperGrid">
        {data.items.map((p) => (
          <article className="card paperCard" key={p._id}>
            <h3 className="paperTitle">{p.subjectName}</h3>
            <div className="paperMeta">
              <span className="tag">{p.department}</span>
              <span className="tag">Year: {p.academicYear}</span>
              <span className="tag">Sem: {p.semester}</span>
              <span className="tag">{p.examType}</span>
              <span className="tag">Downloads: {p.downloads || 0}</span>
            </div>
            <div className="paperActions">
              <a className="btn" href={p.fileUrl} target="_blank" rel="noreferrer">
                View PDF
              </a>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  downloadPaper(p._id);
                }}
              >
                Download
              </button>
            </div>
          </article>
        ))}
      </section>

      <div style={{ height: 30 }} />
    </main>
  );
}

