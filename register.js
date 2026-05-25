import { createUser } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullName, email, phone, country, password } = req.body || {};
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const result = await createUser({
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : "",
      country: country ? String(country).trim() : "",
      password
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "Could not create account" });
  }
}
