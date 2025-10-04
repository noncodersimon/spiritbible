import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function GET() {
  const cwd = process.cwd();
  const p1 = path.join(cwd, "data", "bible.sqlite");
  const p2 = path.join(cwd, "public", "data", "bible.sqlite");

  const exists = (p: string) => {
    try { return fs.existsSync(p); } catch { return false; }
  };

  let dataDir: string[] = [];
  let publicDataDir: string[] = [];
  try { dataDir = fs.readdirSync(path.join(cwd, "data")); } catch {}
  try { publicDataDir = fs.readdirSync(path.join(cwd, "public", "data")); } catch {}

  return NextResponse.json({
    cwd,
    candidates: [p1, p2],
    exists: { [p1]: exists(p1), [p2]: exists(p2) },
    list: { dataDir, publicDataDir },
    env: { NODE_ENV: process.env.NODE_ENV },
  });
}
