const API_BASE = "";

async function request(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function loginAdmin({ username, password }) {
  return request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function listPapers(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return request(`/api/papers${qs ? `?${qs}` : ""}`);
}

export function downloadPaper(id) {
  window.location.href = `/api/papers/${id}/download`;
}

export function adminCreatePaper({ token, metadata, file }) {
  const fd = new FormData();
  Object.entries(metadata).forEach(([k, v]) => fd.append(k, v));
  fd.append("file", file);
  return request("/api/papers", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
}

export function adminUpdatePaper({ token, id, metadata, file }) {
  const fd = new FormData();
  Object.entries(metadata || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    fd.append(k, v);
  });
  if (file) fd.append("file", file);
  return request(`/api/papers/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
}

export function adminDeletePaper({ token, id }) {
  return request(`/api/papers/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function adminStats(token) {
  return request("/api/stats", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function papersMetaDistinct() {
  return request("/api/papers/meta/distinct");
}

export function predictQuestions({ subject, department, semester, examType }) {
  const sp = new URLSearchParams();
  if (department) sp.set("department", department);
  if (semester) sp.set("semester", semester);
  if (examType) sp.set("examType", examType);
  const qs = sp.toString();
  return request(`/api/predict/${encodeURIComponent(subject)}${qs ? `?${qs}` : ""}`);
}

export function repeatedQuestions({ subject, department, semester, examType }) {
  const sp = new URLSearchParams();
  if (department) sp.set("department", department);
  if (semester) sp.set("semester", semester);
  if (examType) sp.set("examType", examType);
  const qs = sp.toString();
  return request(`/api/repeated/${encodeURIComponent(subject)}${qs ? `?${qs}` : ""}`);
}

export function topicAnalytics({ subject, department, semester, examType }) {
  const sp = new URLSearchParams();
  if (department) sp.set("department", department);
  if (semester) sp.set("semester", semester);
  if (examType) sp.set("examType", examType);
  const qs = sp.toString();
  return request(`/api/topics/${encodeURIComponent(subject)}${qs ? `?${qs}` : ""}`);
}

export function adminAnalyzePapers({ token, filters }) {
  return request("/api/analyze-papers", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(filters || {}),
  });
}

export function adminDeleteAiData({ token, subject }) {
  return request(`/api/ai-data/${encodeURIComponent(subject)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

