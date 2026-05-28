import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../../lib/api.js";
import { setToken } from "../../lib/auth.js";

export default function AdminLogin({ setToast }) {
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  return (
    <main className="container" style={{ padding: "22px 0" }}>
      <div className="split">
        <section className="card authCard">
          <h2 style={{ marginTop: 0, color: "var(--text-h)" }}>Admin Login</h2>
          <p className="muted">
            Default credentials are prefilled. Change them in `backend/.env` for production.
          </p>
          <div style={{ height: 12 }} />

          <div className="formGrid">
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
            />
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                  const res = await loginAdmin({ username, password });
                  setToken(res.token);
                  setToast("Login successful");
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
          </div>
        </section>

        <section className="card authCard">
          <h2 style={{ marginTop: 0, color: "var(--text-h)" }}>What you can do</h2>
          <div className="grid">
            <div className="card dashCard">
              <div className="muted">Upload PDFs</div>
              <div style={{ color: "var(--text-h)", fontWeight: 650, fontSize: 18 }}>
                Add papers with metadata
              </div>
            </div>
            <div className="card dashCard">
              <div className="muted">Manage uploads</div>
              <div style={{ color: "var(--text-h)", fontWeight: 650, fontSize: 18 }}>
                Edit or delete anytime
              </div>
            </div>
            <div className="card dashCard">
              <div className="muted">Track usage</div>
              <div style={{ color: "var(--text-h)", fontWeight: 650, fontSize: 18 }}>
                Total uploads & downloads
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

