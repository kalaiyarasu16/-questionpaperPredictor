const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDb } = require("./utils/db");
const { authRouter } = require("./routes/auth");
const { papersRouter } = require("./routes/papers");
const { statsRouter } = require("./routes/stats");
const { aiRouter } = require("./routes/ai");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const uploadDirName = process.env.UPLOAD_DIR || "uploads";
const uploadDirAbs = path.resolve(process.cwd(), uploadDirName);
if (!fs.existsSync(uploadDirAbs)) fs.mkdirSync(uploadDirAbs, { recursive: true });

app.use("/uploads", express.static(uploadDirAbs));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/papers", papersRouter);
app.use("/api/stats", statsRouter);
app.use("/api", aiRouter);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = Number(process.env.PORT || 5000);
connectDb()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", e);
    process.exit(1);
  });

