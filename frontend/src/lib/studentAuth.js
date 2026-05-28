const KEY = "qp_student_session";

export function getStudentSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStudentSession({ username }) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      username,
      createdAt: Date.now(),
    })
  );
}

export function clearStudentSession() {
  localStorage.removeItem(KEY);
}

