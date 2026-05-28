const path = require("path");
const fs = require("fs");
const multer = require("multer");

function getUploadDirAbs() {
  const uploadDirName = process.env.UPLOAD_DIR || "uploads";
  const abs = path.resolve(process.cwd(), uploadDirName);
  if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
  return abs;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadDirAbs()),
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 60);
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, `${safeBase}_${unique}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const isPdf =
    file.mimetype === "application/pdf" ||
    path.extname(file.originalname).toLowerCase() === ".pdf";
  if (!isPdf) return cb(new Error("Only PDF files are allowed"));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

module.exports = { upload, getUploadDirAbs };

