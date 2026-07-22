import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SESSION_DIR = join(homedir(), ".qa-sessions");

function domainKey(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/\./g, "-");
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    return `${host}-${port}`;
  } catch {
    return "unknown";
  }
}

function sessionPath(loginUrl: string): string {
  return join(SESSION_DIR, `${domainKey(loginUrl)}.json`);
}

export function sessionExists(loginUrl: string): boolean {
  return existsSync(sessionPath(loginUrl));
}

export function loadSession(
  loginUrl: string,
): { cookies: Array<{ name: string; value: string; domain: string; path: string }>; localStorage?: Record<string, string> } | null {
  const p = sessionPath(loginUrl);
  if (!existsSync(p)) return null;
  try {
    const data = readFileSync(p, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveSession(
  loginUrl: string,
  storageState: { cookies: any[]; origins?: any[] },
): void {
  mkdirSync(SESSION_DIR, { recursive: true });

  const cookies = storageState.cookies.map((c: any) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || "/",
  }));

  const localStorage: Record<string, string> = {};
  if (storageState.origins) {
    for (const origin of storageState.origins) {
      if (origin.localStorage) {
        for (const item of origin.localStorage) {
          localStorage[item.name] = item.value;
        }
      }
    }
  }

  const data = {
    cookies,
    localStorage: Object.keys(localStorage).length > 0 ? localStorage : undefined,
  };
  writeFileSync(sessionPath(loginUrl), JSON.stringify(data, null, 2), "utf-8");
}

export function clearSession(loginUrl: string): boolean {
  const p = sessionPath(loginUrl);
  if (existsSync(p)) {
    unlinkSync(p);
    return true;
  }
  return false;
}
