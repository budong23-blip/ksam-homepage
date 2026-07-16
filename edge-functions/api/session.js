import { getAdminSession, hasAdminConfig, json } from "../../edge-runtime/auth.js";

export async function onRequestGet({ request, env }) {
  const session = await getAdminSession(request, env);
  return json({
    authenticated: Boolean(session),
    configured: hasAdminConfig(env),
    username: session?.username || null,
  });
}

export function onRequest() {
  return json({ error: "Method not allowed" }, 405, { allow: "GET" });
}
