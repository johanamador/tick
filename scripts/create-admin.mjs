import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw new Error("Add your Supabase URL and secret key to .env.local first.");
const input = createInterface({ input: process.stdin, output: process.stdout });
let username, email;
try {
  username =
    process.env.ADMIN_USERNAME?.trim() ||
    (await input.question("Choose a username: ")).trim();
  email =
    process.env.ADMIN_LOGIN_EMAIL?.trim() ||
    (await input.question("Email: ")).trim();
} finally {
  input.close();
}
if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username))
  throw new Error(
    "Use 3–40 letters, numbers, dots, underscores or hyphens for the username.",
  );
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
  throw new Error("Enter a valid email address.");

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const existing = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (existing.error)
  throw new Error(
    "Could not connect to Supabase Auth. Check your project URL and secret key.",
  );
let user = existing.data.users.find(
  (user) => user.email?.toLowerCase() === email.toLowerCase(),
);

export function readPassword() {
  process.stdout.write("Password (at least 12 characters, hidden): ");
  return new Promise((resolve) => {
    let value = "";
    process.stdin.setEncoding("utf8");
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") process.exit(130);
        if (char === "\r" || char === "\n") {
          process.stdin.off("data", onData);
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}
if (!user) {
  const password = await readPassword();
  if (password.length < 12)
    throw new Error("Use a password with at least 12 characters.");
  const result = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: username },
  });
  if (result.error)
    throw new Error("Could not create the account: " + result.error.message);
  user = result.data.user;
} else
  console.log("Using the existing account. Its password will stay unchanged.");

const membership = await client
  .from("tick_admins")
  .upsert({ user_id: user.id });
if (membership.error)
  throw new Error("Apply the SQL migrations before creating the account.");
const profile = await client
  .from("tick_profiles")
  .upsert(
    { user_id: user.id, display_name: username, avatar_data: null },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
if (profile.error)
  throw new Error(
    "Could not create the profile. Check that all migrations have been applied.",
  );
const { count, error: listError } = await client
  .from("tick_lists")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id);
if (listError) throw new Error("Could not read your lists.");
if (!count) {
  const lists = await client.from("tick_lists").insert([
    { user_id: user.id, title: "Personal", icon: "home", position: 0 },
    { user_id: user.id, title: "Work", icon: "work", position: 1 },
  ]);
  if (lists.error) throw new Error("Could not create the initial lists.");
}
let local = await readFile(".env.local", "utf8");
for (const [key, value] of Object.entries({
  ADMIN_USER_ID: user.id,
  ADMIN_USERNAME: username,
  ADMIN_LOGIN_EMAIL: email,
})) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const setting = key + "=" + JSON.stringify(value);
  local = pattern.test(local)
    ? local.replace(pattern, setting)
    : local.trimEnd() + "\n" + setting + "\n";
}
await writeFile(".env.local", local);
console.log(
  "Your account is ready. Start tick with npm run dev. The password is stored in Supabase Auth, not in this repository.",
);
