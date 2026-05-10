import { NextRequest } from "next/server";

export function checkAuth(req: NextRequest): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return true; // no passcode set => no gate (dev only)
  const provided = req.headers.get("x-passcode");
  return provided === expected;
}
