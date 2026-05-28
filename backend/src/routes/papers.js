const express = require("express");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const Paper = require("../models/Paper");
const { requireAdmin } = require("../middleware/auth");
const { upload, getUploadDirAbs } = require("../utils/upload");

const papersRouter = express.Router();

function buildQuery(q) {
  const query = {};
  if (q.subjectName) query.subjectName = new RegExp(escapeRegex(q.subjectName), "i");
  if (q.department) query.department = q.department;
  if (q.academicYear) query.academicYear = q.academicYear;
  if (q.semester) query.semester = q.semester;
  if (q.examType) query.examType = q.examType;
  if (q.search) {
    query.$or = [
      { subjectName: new RegExp(escapeRegex(q.search), "i") },
      { department: new RegExp(escapeRegex(q.search), "i") },
      { academicYear: new RegExp(escapeRegex(q.search), "i") },
      { semester: new RegExp(escapeRegex(q.search), "i") },
    ];
  }
  return query;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Public: list papers with filters/search
papersRouter.get("/", async (req, res, next) => {
  try {
    const schema = z.object({
      search: z.string().optional(),
      subjectName: z.string().optional(),
      department: z.string().optional(),
      academicYear: z.string().optional(),
      semester: z.string().optional(),
      examType: z.enum(["Mid", "Model", "Semester"]).optional(),
      sort: z.enum(["recent", "downloads"]).optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

    const { sort, page = 1, limit = 12, ...filters } = parsed.data;
    const query = buildQuery(filters);

    const sortObj = sort === "downloads" ? { downloads: -1, createdAt: -1 } : { createdAt: -1 };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Paper.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Paper.countDocuments(query),
    ]);

    return res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    next(e);
  }
});

// Public: metadata for dropdowns (distinct values)
papersRouter.get("/meta/distinct", async (_req, res, next) => {
  try {
    const [subjects, departments, semesters, years] = await Promise.all([
      Paper.distinct("subjectName"),
      Paper.distinct("department"),
      Paper.distinct("semester"),
      Paper.distinct("academicYear"),
    ]);
    return res.json({
      subjects: (subjects || []).filter(Boolean).sort(),
      departments: (departments || []).filter(Boolean).sort(),
      semesters: (semesters || []).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
      academicYears: (years || []).filter(Boolean).sort(),
    });
  } catch (e) {
    next(e);
  }
});

// Public: download (increments counter, sends file)
papersRouter.get("/:id/download", async (req, res, next) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Not found" });

    const fileAbs = path.join(getUploadDirAbs(), paper.fileName);
    if (!fs.existsSync(fileAbs)) return res.status(404).json({ message: "File missing" });

    paper.downloads += 1;
    await paper.save();

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(paper.fileOriginalName)}"`
    );
    return res.download(fileAbs, paper.fileOriginalName);
  } catch (e) {
    next(e);
  }
});

// Admin: create (upload PDF)
papersRouter.post("/", requireAdmin, upload.single("file"), async (req, res, next) => {
  try {
    const schema = z.object({
      subjectName: z.string().min(1),
      department: z.string().min(1),
      academicYear: z.string().min(1),
      semester: z.string().min(1),
      examType: z.enum(["Mid", "Model", "Semester"]),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid metadata" });
    if (!req.file) return res.status(400).json({ message: "Missing PDF file" });

    const paper = await Paper.create({
      ...parsed.data,
      fileOriginalName: req.file.originalname,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    return res.status(201).json(paper);
  } catch (e) {
    next(e);
  }
});

// Admin: update metadata (optional replace PDF)
papersRouter.put("/:id", requireAdmin, upload.single("file"), async (req, res, next) => {
  try {
    const schema = z
      .object({
        subjectName: z.string().min(1).optional(),
        department: z.string().min(1).optional(),
        academicYear: z.string().min(1).optional(),
        semester: z.string().min(1).optional(),
        examType: z.enum(["Mid", "Model", "Semester"]).optional(),
      })
      .refine((v) => Object.keys(v).length > 0 || !!req.file, "Nothing to update");

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Not found" });

    Object.assign(paper, parsed.data);

    if (req.file) {
      const oldAbs = path.join(getUploadDirAbs(), paper.fileName);
      if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);

      paper.fileOriginalName = req.file.originalname;
      paper.fileName = req.file.filename;
      paper.fileUrl = `/uploads/${req.file.filename}`;
      paper.fileSize = req.file.size;
      paper.mimeType = req.file.mimetype;
    }

    await paper.save();
    return res.json(paper);
  } catch (e) {
    next(e);
  }
});

// Admin: delete
papersRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Not found" });

    const fileAbs = path.join(getUploadDirAbs(), paper.fileName);
    if (fs.existsSync(fileAbs)) fs.unlinkSync(fileAbs);

    await paper.deleteOne();
    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = { papersRouter };

