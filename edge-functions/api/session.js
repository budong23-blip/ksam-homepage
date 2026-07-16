import { getAdminConfig, getAdminSession, json } from "../../edge-runtime/auth.js";

export async function onRequestGet({ request, env }) {
  const config = await getAdminConfig(env);
  const session = await getAdminSession(request, env);
  return json({
    authenticated: Boolean(session),
    configured: Boolean(config),
    username: session?.username || null,
  });
}
