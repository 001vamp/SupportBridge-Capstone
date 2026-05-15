export function requireReviewerAccess(req, res, next) {
  const expectedKey = process.env.REVIEWER_ACCESS_KEY;
  if (!expectedKey) return next();

  const providedKey = req.get("x-reviewer-key");
  if (providedKey === expectedKey) return next();

  return res.status(403).json({ error: "Reviewer access denied." });
}
