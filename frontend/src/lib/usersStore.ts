import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type Store = { users: UserRecord[] };

function hasNextDependency(dir: string): boolean {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return Boolean(pkg.dependencies?.next || pkg.devDependencies?.next);
  } catch {
    return false;
  }
}

function isNextAppDir(dir: string): boolean {
  const hasCfg =
    fs.existsSync(path.join(dir, "next.config.ts")) ||
    fs.existsSync(path.join(dir, "next.config.mjs")) ||
    fs.existsSync(path.join(dir, "next.config.js"));
  return hasCfg && hasNextDependency(dir);
}

/**
 * Resolves the folder that contains next.config + package.json with `next`
 * (normally …/frontend), even when `process.cwd()` is the monorepo root.
 */
export function findNextAppRoot(): string {
  let dir = path.resolve(process.cwd());
  for (let i = 0; i < 14; i++) {
    if (isNextAppDir(dir)) return dir;
    const fe = path.join(dir, "frontend");
    if (fs.existsSync(fe) && isNextAppDir(fe)) return fe;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const scanned = scanForNextApp(process.cwd(), 4);
  if (scanned) return scanned;

  return path.resolve(process.cwd());
}

const SKIP_DIR = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

function scanForNextApp(start: string, maxDepth: number): string | null {
  const startAbs = path.resolve(start);
  const queue: { d: string; depth: number }[] = [{ d: startAbs, depth: 0 }];
  const seen = new Set<string>();
  let budget = 250;

  while (queue.length > 0 && budget-- > 0) {
    const { d, depth } = queue.shift()!;
    if (seen.has(d) || depth > maxDepth) continue;
    seen.add(d);
    if (isNextAppDir(d)) return d;
    if (depth === maxDepth) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory() || SKIP_DIR.has(e.name)) continue;
      queue.push({ d: path.join(d, e.name), depth: depth + 1 });
    }
  }
  return null;
}

/** Lambda has a read-only /var/task; Vercel is similar. Use a writable tmp dir unless overridden. */
function isServerlessReadonlyDeploy(): boolean {
  if (process.env.AUTH_USE_TMP_DIR === "1") return true;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return true;
  if (process.env.AWS_EXECUTION_ENV) return true;
  if (process.env.LAMBDA_TASK_ROOT) return true;
  if (process.env.VERCEL) return true;
  if (process.cwd().startsWith("/var/task")) return true;
  return false;
}

let cachedUsersFile: string | null = null;

function resolveUsersFile(): string {
  const fromEnv = process.env.AUTH_USERS_FILE?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  const dirFromEnv = process.env.AUTH_DATA_DIR?.trim();
  if (dirFromEnv) return path.join(path.resolve(dirFromEnv), "users.json");
  if (isServerlessReadonlyDeploy()) {
    return path.join(tmpdir(), "vitalis-auth", "users.json");
  }
  return path.join(findNextAppRoot(), "data", "users.json");
}

export function getUsersFilePath(): string {
  if (!cachedUsersFile) {
    cachedUsersFile = resolveUsersFile();
  }
  return cachedUsersFile;
}

/** Call after changing AUTH_* env at runtime (tests). */
export function resetUsersFileCache(): void {
  cachedUsersFile = null;
}

function readStore(): Store {
  const usersFile = getUsersFilePath();
  try {
    const raw = fs.readFileSync(usersFile, "utf-8");
    const data = JSON.parse(raw) as Store;
    if (!data || !Array.isArray(data.users)) return { users: [] };
    return data;
  } catch {
    return { users: [] };
  }
}

function writeStore(store: Store): void {
  const usersFile = getUsersFilePath();
  const dataDir = path.dirname(usersFile);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(usersFile, JSON.stringify(store), "utf-8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not write user data to ${usersFile}: ${msg}. For AWS Lambda / Vercel, leave AUTH_DATA_DIR unset to use \`${path.join(tmpdir(), "vitalis-auth")}\`, or set AUTH_USERS_FILE / AUTH_DATA_DIR to a writable path (e.g. a mounted volume).`
    );
  }
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const e = email.trim().toLowerCase();
  return readStore().users.find((u) => u.email === e);
}

export class EmailInUseError extends Error {
  constructor() {
    super("EMAIL_IN_USE");
    this.name = "EmailInUseError";
  }
}

export function createUser(email: string, passwordHash: string): UserRecord {
  const store = readStore();
  const e = email.trim().toLowerCase();
  if (store.users.some((u) => u.email === e)) {
    throw new EmailInUseError();
  }
  const user: UserRecord = {
    id: randomUUID(),
    email: e,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  writeStore(store);

  const roundTrip = readStore().users.find((u) => u.email === e);
  if (!roundTrip) {
    throw new Error(
      `Account was not readable after save (file: ${getUsersFilePath()}). On serverless, use the same instance /tmp store, set AUTH_USERS_FILE to shared storage, or use a database.`
    );
  }
  return user;
}
