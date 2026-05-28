import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginAdmin } from "../lib/api.js";
import { clearToken, setToken } from "../lib/auth.js";
import { clearStudentSession, setStudentSession } from "../lib/studentAuth.js";

function useQuery() {
  const loc = useLocation();
  return useMemo(() => new URLSearchParams(loc.search), [loc.search]);
}

export default function Login({ setToast }) {
  const nav = useNavigate();
  const q = useQuery();
  const initialMode = q.get("mode") === "admin" ? "admin" : "student";
  const [mode, setMode] = useState(initialMode);

  const [studentUsername, setStudentUsername] = useState("student");
  const [studentPassword, setStudentPassword] = useState("student123");

  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  return (
    <main className="container" style={{ padding: "22px 0" }}>
      <section className="card authCard" style={{ maxWidth: 980, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0, color: "var(--text-h)" }}>Login</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Choose Student or Admin. Defaults are prefilled.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className={`btn ${mode === "student" ? "primary" : ""}`}
            type="button"
            onClick={() => setMode("student")}
          >
            Student
          </button>
          <button
            className={`btn ${mode === "admin" ? "primary" : ""}`}
            type="button"
            onClick={() => setMode("admin")}
          >
            Admin
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn"
            type="button"
            onClick={() => {
              clearToken();
              clearStudentSession();
              setToast("Cleared saved login");
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ height: 14 }} />

        {mode === "student" ? (
          <div className="formGrid" style={{ maxWidth: 520 }}>
            <input
              className="input"
              value={studentUsername}
              onChange={(e) => setStudentUsername(e.target.value)}
              placeholder="Student username"
              autoComplete="username"
            />
            <input
              className="input"
              value={studentPassword}
              onChange={(e) => setStudentPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
            />
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                if (!studentUsername || !studentPassword) {
                  setToast("Enter student username and password");
                  return;
                }
                setStudentSession({ username: studentUsername.trim() });
                setToast("Student login successful");
                nav("/papers");
              }}
            >
              Continue
            </button>
            <div className="muted" style={{ fontSize: 13 }}>
              Student login is local-only (no server auth).
            </div>
          </div>
        ) : (
          <div className="formGrid" style={{ maxWidth: 520 }}>
            <input
              className="input"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              placeholder="Admin username"
              autoComplete="username"
            />
            <input
              className="input"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
            />
            <button
              className="btn primary"
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  const res = await loginAdmin({ username: adminUsername, password: adminPassword });
                  setToken(res.token);
                  setToast("Admin login successful");
                  nav("/admin/dashboard");
                } catch (e) {
                  setToast(e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <div className="muted" style={{ fontSize: 13 }}>
              Admin credentials can be changed in <code>backend/.env</code>.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

