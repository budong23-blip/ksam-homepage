const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");

navToggle?.addEventListener("click", () => {
  nav?.classList.toggle("is-open");
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove("is-open");
  }
});

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const noticeList = document.querySelector("[data-notice-list]");

const addNoticeText = (container, tagName, text, className) => {
  if (!text) return;
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  container.append(element);
};

const renderNotices = (notices) => {
  if (!noticeList) return;

  const visibleNotices = notices
    .filter((notice) => notice.published !== false)
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return String(b.date).localeCompare(String(a.date));
    });

  noticeList.replaceChildren();

  if (visibleNotices.length === 0) {
    addNoticeText(
      noticeList,
      "p",
      "暂无公告。 / 등록된 공지사항이 없습니다.",
      "notice-status",
    );
    return;
  }

  visibleNotices.forEach((notice) => {
    const article = document.createElement("article");
    article.className = "notice-card";

    const time = document.createElement("time");
    time.dateTime = notice.date;
    time.textContent = String(notice.date).replaceAll("-", ".");

    const content = document.createElement("div");
    addNoticeText(
      content,
      "span",
      notice.pinned ? `Pinned · ${notice.type || "Notice"}` : notice.type || "Notice",
      "notice-type",
    );
    addNoticeText(content, "h2", notice.title_zh);
    addNoticeText(content, "p", notice.body_zh);
    addNoticeText(content, "h3", notice.title_ko, "ko-title notice-ko-title");
    addNoticeText(content, "p", notice.body_ko, "ko-summary");

    article.append(time, content);
    noticeList.append(article);
  });
};

if (noticeList) {
  fetch("./data/notices.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => renderNotices(Array.isArray(data.notices) ? data.notices : []))
    .catch(() => {
      noticeList.replaceChildren();
      addNoticeText(
        noticeList,
        "p",
        "公告暂时无法显示。 / 공지사항을 불러오지 못했습니다.",
        "notice-status notice-error",
      );
    });
}
