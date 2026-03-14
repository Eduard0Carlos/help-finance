import { NextRequest } from "next/server";
import { verifyToken, TOKEN_COOKIE, JwtPayload } from "./jwt";

export function getSession(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
