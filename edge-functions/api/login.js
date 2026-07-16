import {
  createSessionToken,
  credentialsMatch,
  hasAdminConfig,
  isSameOrigin,
  json,
  sessionCookie,
} from "../../edge-runtime/auth.js";

export async function onRequestPost({ request, env }) {
  if (!hasAdminConfig(env)) {
    return json({ error: "관리자 환경변수 설정이 필요합니다." }, 503);
  }
  if (!isSameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);

  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return json({ error: "입력 형식이 올바르지 않습니다." }, 400);
  }

  if (!credentialsMatch(env, credentials.username || "", credentials.password || "")) {
    return json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
  }

  const token = await createSessionToken(env.ADMIN_USERNAME, env.SESSION_SECRET);
  return json(
    { authenticated: true, username: env.ADMIN_USERNAME },
    200,
    { "set-cookie": sessionCookie(token) },
  );
}

export function onRequest() {
  return json({ error: "Method not allowed" }, 405, { allow: "POST" });
}
