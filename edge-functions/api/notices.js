import { getStore } from "@edgeone/pages-blob";
import { getAdminSession, isSameOrigin, json } from "../../edge-runtime/auth.js";

const STORE_NAME = "ksam-content";
const NOTICES_KEY = "content/notices.json";
const SEED_VERSION = "conference-2026-08-19";
const SEEDED_NOTICE = {
  id: "ksam-2026-08-19-conference",
  date: "2026-07-17",
  type: "Academic Conference / 학술회",
  pinned: true,
  published: true,
  title: "KSAM第四届定期学术会议通知 / KSAM 제4회 정기 학술회의 안내",
  body: [
    "<p><strong>韩国医疗美容学术交流会 · 第四届定期学术会议<br>한국 의료미용 학술교류회 · 제4회 정기 학술회의</strong></p>",
    "<blockquote><strong>Skin Longevity × Undetectable</strong><br>皮肤长寿 × 无痕美学<br>피부수명의 연장 × 자연스러운 아름다움</blockquote>",
    "<h2>会议信息 / 행사 안내</h2>",
    "<ul><li><strong>日期 / 일시:</strong> 2026年8月19日 星期三 / 2026년 8월 19일 수요일</li><li><strong>地点 / 장소:</strong> 北京东直门亚朵S酒店 / 베이징 동직문 아투어 S 호텔</li><li><strong>签到 / 등록:</strong> 09:00</li><li><strong>开幕式 / 개회:</strong> 09:30</li></ul>",
    "<h2>会议介绍 / 학술회의 소개</h2>",
    "<p>本次会议以皮肤抗衰设计、再生医学、Skin Booster与自然美学为核心，邀请韩中医疗美容专家分享最新临床经验与实用治疗策略。</p>",
    "<p>이번 학술회의는 피부 항노화 설계, 재생의학, 스킨부스터와 자연미학을 중심으로 한·중 의료미용 전문가들의 최신 임상 경험과 실전 치료 전략을 공유합니다.</p>",
    "<h2>主要日程 / 주요 일정</h2>",
    "<p>09:00부터 등록을 시작하며 09:30에 개회식이 진행됩니다. 세부 강연 프로그램과 연자 소개는 아래 전체 포스터를 확인해 주십시오.<br>09:00开始签到，09:30举行开幕式。详细演讲日程及讲师介绍请查看下方完整海报。</p>",
    "<img src=\"/assets/conference-2026-08-19.jpg\" alt=\"KSAM 제4회 정기 학술회의 전체 포스터\">",
    "<p>포스터 이미지를 누르면 확대·축소하여 자세히 볼 수 있습니다.<br>点击海报后可放大、缩小并查看详细内容。</p>",
    "<h2>咨询 / 문의</h2>",
    "<p>参会及合作咨询请联系KSAM秘书处。<br>참가 및 협력 문의는 KSAM 사무국으로 연락해 주십시오.</p>",
    "<ul><li><strong>E-mail:</strong> <a href=\"mailto:admin@ksam-edu.com\">admin@ksam-edu.com</a></li><li><strong>WeChat:</strong> ksam_official</li></ul>",
  ].join(""),
};
const DEFAULT_NOTICES = {
  notices: [SEEDED_NOTICE],
  seedVersion: SEED_VERSION,
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
  if (current && Array.isArray(current.notices)) {
    if (current.seedVersion === SEED_VERSION) return current;

    const notices = current.notices.some((notice) => notice.id === SEEDED_NOTICE.id)
      ? current.notices
      : [SEEDED_NOTICE, ...current.notices];
    const migrated = { notices, seedVersion: SEED_VERSION };
    await store.setJSON(NOTICES_KEY, migrated);
    return migrated;
  }

  await store.setJSON(NOTICES_KEY, DEFAULT_NOTICES);
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

  const data = {
    notices: input.notices.map(normalizeNotice),
    seedVersion: SEED_VERSION,
  };
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.setJSON(NOTICES_KEY, data);
  return json({ saved: true, ...data });
}
