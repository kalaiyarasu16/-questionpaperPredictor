import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import "./App.css";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Predict from "./pages/Predict.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import { clearToken, getToken } from "./lib/auth.js";
import { clearStudentSession, getStudentSession } from "./lib/studentAuth.js";

function Protected({ children }) {
  const token = getToken();
  const loc = useLocation();
  if (!token) return <Navigate to="/admin" replace state={{ from: loc.pathname }} />;
  return children;
}

function ProtectedStudent({ children }) {
  const session = getStudentSession();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function App() {
  const [toast, setToast] = useState("");
  const token = useMemo(() => getToken(), [toast]); // cheap trigger when logout happens
  const studentSession = useMemo(() => getStudentSession(), [toast]);

  return (
    <>
      <header className="nav">
        <div className="container navInner">
          <Link className="brand" to="/">
            <span className="brandMark" aria-hidden="true" />
            Question Paper Portal
          </Link>
          <nav className="navLinks">
            <Link className="btn" to="/login">
              Login
            </Link>
            {studentSession ? (
              <Link className="btn" to="/predict">
                Prediction
              </Link>
            ) : null}
            {token || studentSession ? (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  clearToken();
                  clearStudentSession();
                  setToast("Logged out");
                  window.location.href = "/login";
                }}
              >
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/login" element={<Login setToast={setToast} />} />
        <Route
          path="/papers"
          element={
            <ProtectedStudent>
              <Home setToast={setToast} />
            </ProtectedStudent>
          }
        />
        <Route
          path="/predict"
          element={
            <ProtectedStudent>
              <Predict setToast={setToast} />
            </ProtectedStudent>
          }
        />
        <Route path="/admin" element={<Navigate to="/login?mode=admin" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <Protected>
              <AdminDashboard setToast={setToast} />
            </Protected>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {toast ? (
        <div className="toast" role="status">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span>{toast}</span>
            <button className="btn" type="button" onClick={() => setToast("")}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;
