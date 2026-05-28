const express = require("express");

const Paper = require("../models/Paper");
const { requireAdmin } = require("../middleware/auth");

const statsRouter = express.Router();

// Admin-only stats
statsRouter.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const [totalUploads, totalDownloads] = await Promise.all([
      Paper.countDocuments({}),
      Paper.aggregate([{ $group: { _id: null, total: { $sum: "$downloads" } } }]),
    ]);
    const downloads = totalDownloads[0]?.total || 0;
    return res.json({ totalUploads, totalDownloads: downloads });
  } catch (e) {
    next(e);
  }
});

module.exports = { statsRouter };

