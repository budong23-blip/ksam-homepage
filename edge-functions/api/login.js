import {
  createSessionToken,
  credentialsMatch,
  getAdminConfig,
  isSameOrigin,
  json,
  sessionCookie,
} from "../../edge-runtime/auth.js";

export async function onRequestPost({ request, env }) {
  const config = await getAdminConfig(env);
  if (!config) return json({ error: "먼저 관리자 계정을 등록하세요." }, 503);
  if (!isSameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);

  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return json({ error: "입력 형식이 올바르지 않습니다." }, 400);
  }

  if (!(await credentialsMatch(config, credentials.username || "", credentials.password || ""))) {
    return json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
  }

  const token = await createSessionToken(config.username, config.sessionSecret);
  return json(
    { authenticated: true, username: config.username },
    200,
    { "set-cookie": sessionCookie(token) },
  );
}
