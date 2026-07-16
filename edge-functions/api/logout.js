import { clearSessionCookie, isSameOrigin, json } from "../../edge-runtime/auth.js";

export function onRequestPost({ request }) {
  if (!isSameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);
  return json(
    { authenticated: false },
    200,
    { "set-cookie": clearSessionCookie() },
  );
}

export function onRequest() {
  return json({ error: "Method not allowed" }, 405, { allow: "POST" });
}
