import { getStore } from "@edgeone/pages-blob";
import { getAdminSession, isSameOrigin, json } from "../../edge-runtime/auth.js";

const STORE_NAME = "ksam-content";
const NOTICES_KEY = "content/notices.json";
const DEFAULT_NOTICES = {
  notices: [],
};

const normalizeNotice = (notice, index) => ({
  id: String(notice.id || `notice-${Date.now()}-${index}`).slice(0, 100),
  date: /^\d{4}-\d{2}-\d{2}$/u.test(String(notice.date))
    ? String(notice.date)
    : new Date().toISOString().slice(0, 10),
  type: String(notice.type || "Notice").slice(0, 40),
  pinned: Boolean(notice.pinned),
  published: notice.published !== false,
  title: String(notice.title || "").slice(0, 500),
  body: String(notice.body || "").slice(0, 500000),
});

const getNotices = async () => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const current = await store.get(NOTICES_KEY, { type: "json", consistency: "strong" });
  if (current && Array.isArray(current.notices)) return current;

  await store.setJSON(NOTICES_KEY, DEFAULT_NOTICES, { onlyIfNew: true });
  return DEFAULT_NOTICES;
};

export async function onRequestGet() {
  const data = await getNotices();
  return json(data, 200, { "cache-control": "no-cache" });
}

export async function onRequestPut({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);
  if (!(await getAdminSession(request, env))) {
    return json({ error: "로그인이 필요합니다." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) return json({ error: "공지 데이터가 너무 큽니다." }, 413);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "입력 형식이 올바르지 않습니다." }, 400);
  }

  if (!Array.isArray(input.notices) || input.notices.length > 100) {
    return json({ error: "공지 목록 형식이 올바르지 않습니다." }, 400);
  }

  const data = { notices: input.notices.map(normalizeNotice) };
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.setJSON(NOTICES_KEY, data);
  return json({ saved: true, ...data });
}
