const express = require("express");
const { z } = require("zod");
const { requireAdmin } = require("../middleware/auth");

const aiRouter = express.Router();

const AI_BASE = process.env.AI_SERVICE_URL || "http://127.0.0.1:8001";

async function proxyJson({ method, path, body, timeoutMs = 120000 }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const detail = data && data.detail;
      const message =
        (typeof detail === "string" && detail) ||
        (detail && typeof detail === "object" && (detail.message || detail.error)) ||
        (data && data.message) ||
        `AI service error (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

function sendProxyError(res, e) {
  const status = Number(e.status || 500);
  const detail = e.data || null;
  return res.status(status).json({
    message: e.message || "AI service error",
    detail,
  });
}

// Admin: trigger analysis (stores extracted_questions + predictions)
aiRouter.post("/analyze-papers", requireAdmin, async (req, res, next) => {
  try {
    const schema = z
      .object({
        subjectName: z.string().min(1).optional(),
        department: z.string().min(1).optional(),
        semester: z.string().min(1).optional(),
        examType: z.enum(["Mid", "Model", "Semester"]).optional(),
      })
      .optional();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    const data = await proxyJson({
      method: "POST",
      path: "/analyze-papers",
      body: parsed.data || {},
      timeoutMs: 10 * 60 * 1000,
    });
    return res.json(data);
  } catch (e) {
    return sendProxyError(res, e);
  }
});

// Student/public: predictions
aiRouter.get("/predict/:subject", async (req, res, next) => {
  try {
    const schema = z.object({
      department: z.string().optional(),
      semester: z.string().optional(),
      examType: z.enum(["Mid", "Model", "Semester"]).optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

    const sp = new URLSearchParams();
    Object.entries(parsed.data).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      sp.set(k, String(v));
    });
    const qs = sp.toString();

    const data = await proxyJson({
      method: "GET",
      path: `/predict/${encodeURIComponent(req.params.subject)}${qs ? `?${qs}` : ""}`,
    });
    return res.json(data);
  } catch (e) {
    return sendProxyError(res, e);
  }
});

aiRouter.get("/repeated/:subject", async (req, res, next) => {
  try {
    const sp = new URLSearchParams();
    ["department", "semester", "examType"].forEach((k) => {
      if (!req.query[k]) return;
      sp.set(k, String(req.query[k]));
    });
    const qs = sp.toString();
    const data = await proxyJson({
      method: "GET",
      path: `/repeated/${encodeURIComponent(req.params.subject)}${qs ? `?${qs}` : ""}`,
    });
    return res.json(data);
  } catch (e) {
    return sendProxyError(res, e);
  }
});

aiRouter.get("/topics/:subject", async (req, res, next) => {
  try {
    const sp = new URLSearchParams();
    ["department", "semester", "examType"].forEach((k) => {
      if (!req.query[k]) return;
      sp.set(k, String(req.query[k]));
    });
    const qs = sp.toString();
    const data = await proxyJson({
      method: "GET",
      path: `/topics/${encodeURIComponent(req.params.subject)}${qs ? `?${qs}` : ""}`,
    });
    return res.json(data);
  } catch (e) {
    return sendProxyError(res, e);
  }
});

// Admin: delete extracted data / predictions for a subject (cleanup)
aiRouter.delete("/ai-data/:subject", requireAdmin, async (req, res, next) => {
  try {
    const data = await proxyJson({
      method: "DELETE",
      path: `/ai-data/${encodeURIComponent(req.params.subject)}`,
    });
    return res.json(data);
  } catch (e) {
    return sendProxyError(res, e);
  }
});

module.exports = { aiRouter };

