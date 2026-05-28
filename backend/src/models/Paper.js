const mongoose = require("mongoose");

const PaperSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true, index: true },
    department: { type: String, required: true, index: true },
    academicYear: { type: String, required: true, index: true }, // e.g. "2024-2025"
    semester: { type: String, required: true, index: true }, // keep string for flexibility
    examType: {
      type: String,
      required: true,
      enum: ["Mid", "Model", "Semester"],
      index: true,
    },

    fileOriginalName: { type: String, required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },

    downloads: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

PaperSchema.index({
  subjectName: "text",
  department: "text",
  academicYear: "text",
  semester: "text",
});

module.exports = mongoose.model("Paper", PaperSchema);

