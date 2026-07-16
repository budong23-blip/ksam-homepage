import {
  createAdminConfig,
  createSessionToken,
  hasAdminConfig,
  isSameOrigin,
  json,
  sessionCookie,
} from "../../edge-runtime/auth.js";

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);
  if (await hasAdminConfig(env)) {
    return json({ error: "관리자 계정이 이미 등록되어 있습니다." }, 409);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "입력 형식이 올바르지 않습니다." }, 400);
  }

  try {
    const config = await createAdminConfig(input.username, input.password);
    const token = await createSessionToken(config.username, config.sessionSecret);
    return json(
      { authenticated: true, configured: true, username: config.username },
      201,
      { "set-cookie": sessionCookie(token) },
    );
  } catch (error) {
    const conflict = /이미 등록/u.test(error.message);
    return json({ error: error.message || "관리자 계정을 등록하지 못했습니다." }, conflict ? 409 : 400);
  }
}
