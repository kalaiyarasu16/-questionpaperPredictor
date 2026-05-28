const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const authRouter = express.Router();

authRouter.post("/login", (req, res) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const { username, password } = parsed.data;
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: "Server misconfigured" });

  const token = jwt.sign({ role: "admin", username }, secret, { expiresIn: "12h" });
  return res.json({ token, username });
});

module.exports = { authRouter };

