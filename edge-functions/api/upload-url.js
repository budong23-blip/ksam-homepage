import { getStore } from "@edgeone/pages-blob";
import { getAdminSession, isSameOrigin, json } from "../../edge-runtime/auth.js";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);
  if (!(await getAdminSession(request, env))) {
    return json({ error: "로그인이 필요합니다." }, 401);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "입력 형식이 올바르지 않습니다." }, 400);
  }

  const extension = allowedTypes.get(String(input.contentType || ""));
  if (!extension) return json({ error: "JPG, PNG, WEBP, GIF만 올릴 수 있습니다." }, 400);

  const key = `notices/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const store = getStore("ksam-media");
  const upload = await store.createUploadUrl(key, {
    expireSeconds: 600,
    contentType: input.contentType,
  });

  return json({
    uploadUrl: upload.url,
    key: upload.key,
    publicUrl: `/api/media-file/${upload.key}`,
    expiresAt: upload.expiresAt,
  });
}
