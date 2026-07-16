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
const homeNoticeList = document.querySelector("[data-home-notice-list]");
const noticeDetail = document.querySelector("[data-notice-detail]");

const addNoticeText = (container, tagName, text, className) => {
  if (!text) return;
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  container.append(element);
};

const getVisibleNotices = (notices) =>
  notices
    .filter((notice) => notice.published !== false)
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return String(b.date).localeCompare(String(a.date));
    });

const getNoticeTitle = (notice) =>
  String(notice.title || notice.title_zh || notice.title_ko || "公告 / 공지사항");

const getNoticeDetailUrl = (notice) => {
  const detailParams = new URLSearchParams({
    date: String(notice.date),
    title: getNoticeTitle(notice),
  });
  return `./notice-detail.html?${detailParams.toString()}`;
};

const setupNoticeImageViewer = (container) => {
  const images = container.querySelectorAll("img");
  if (images.length === 0) return;

  const viewer = document.createElement("div");
  viewer.className = "image-viewer";
  viewer.hidden = true;
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", "Image viewer");

  const stage = document.createElement("div");
  stage.className = "image-viewer-stage";

  const viewerImage = document.createElement("img");
  viewerImage.draggable = false;

  const controls = document.createElement("div");
  controls.className = "image-viewer-controls";

  const createControlButton = (className, label, text) => {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    return button;
  };

  const zoomOutButton = createControlButton(
    "image-viewer-zoom-button",
    "Zoom out",
    "−",
  );
  const resetButton = createControlButton(
    "image-viewer-zoom-value",
    "Reset zoom",
    "100%",
  );
  const zoomInButton = createControlButton(
    "image-viewer-zoom-button",
    "Zoom in",
    "+",
  );
  const closeButton = document.createElement("button");
  closeButton.className = "image-viewer-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close image viewer");

  stage.append(viewerImage);
  controls.append(zoomOutButton, resetButton, zoomInButton);
  viewer.append(stage, controls, closeButton);
  document.body.append(viewer);

  let activeImage = null;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  const updateTransform = () => {
    viewerImage.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    resetButton.textContent = `${Math.round(scale * 100)}%`;
    viewerImage.classList.toggle("is-draggable", scale > 1);
  };

  const setZoom = (nextScale) => {
    scale = Math.min(5, Math.max(0.5, nextScale));
    if (scale <= 1) {
      offsetX = 0;
      offsetY = 0;
    }
    updateTransform();
  };

  const resetZoom = () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    updateTransform();
  };

  const closeViewer = () => {
    viewer.hidden = true;
    viewerImage.removeAttribute("src");
    document.body.classList.remove("has-image-viewer");
    resetZoom();
    activeImage?.focus();
    activeImage = null;
  };

  const openViewer = (image) => {
    activeImage = image;
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt || "";
    viewer.hidden = false;
    document.body.classList.add("has-image-viewer");
    resetZoom();
    closeButton.focus();
  };

  images.forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `${image.alt || "Image"} - enlarge`);
    image.addEventListener("click", () => openViewer(image));
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openViewer(image);
      }
    });
  });

  zoomOutButton.addEventListener("click", () => setZoom(scale / 1.25));
  resetButton.addEventListener("click", resetZoom);
  zoomInButton.addEventListener("click", () => setZoom(scale * 1.25));
  closeButton.addEventListener("click", closeViewer);
  stage.addEventListener("click", (event) => {
    if (event.target === stage) closeViewer();
  });
  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      setZoom(event.deltaY < 0 ? scale * 1.15 : scale / 1.15);
    },
    { passive: false },
  );
  viewerImage.addEventListener("pointerdown", (event) => {
    if (scale <= 1) return;
    dragging = true;
    dragStartX = event.clientX - offsetX;
    dragStartY = event.clientY - offsetY;
    viewerImage.classList.add("is-dragging");
    viewerImage.setPointerCapture(event.pointerId);
  });
  viewerImage.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    offsetX = event.clientX - dragStartX;
    offsetY = event.clientY - dragStartY;
    updateTransform();
  });
  const stopDragging = (event) => {
    if (!dragging) return;
    dragging = false;
    viewerImage.classList.remove("is-dragging");
    if (viewerImage.hasPointerCapture(event.pointerId)) {
      viewerImage.releasePointerCapture(event.pointerId);
    }
  };
  viewerImage.addEventListener("pointerup", stopDragging);
  viewerImage.addEventListener("pointercancel", stopDragging);
  viewerImage.addEventListener("dblclick", resetZoom);

  document.addEventListener("keydown", (event) => {
    if (viewer.hidden) return;

    if (event.key === "Escape") {
      closeViewer();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(scale * 1.25);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom(scale / 1.25);
    } else if (event.key === "0") {
      event.preventDefault();
      resetZoom();
    }
  });
};

const renderNotices = (notices) => {
  if (!noticeList) return;

  const visibleNotices = getVisibleNotices(notices);

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
    const heading = document.createElement("h2");
    const headingLink = document.createElement("a");
    headingLink.className = "notice-card-link";
    headingLink.href = getNoticeDetailUrl(notice);
    headingLink.textContent = getNoticeTitle(notice);
    heading.append(headingLink);
    content.append(heading);

    if (!notice.title && notice.title_ko) {
      addNoticeText(content, "h3", notice.title_ko, "ko-title notice-ko-title");
    }

    const readMore = document.createElement("a");
    readMore.className = "notice-read-more";
    readMore.href = getNoticeDetailUrl(notice);
    readMore.textContent = "查看详情 / 자세히 보기";
    content.append(readMore);

    article.append(time, content);
    noticeList.append(article);
  });
};

const renderHomeNotices = (notices) => {
  if (!homeNoticeList) return;

  const visibleNotices = getVisibleNotices(notices).slice(0, 3);
  homeNoticeList.replaceChildren();

  if (visibleNotices.length === 0) {
    addNoticeText(
      homeNoticeList,
      "p",
      "暂无公告。 / 등록된 공지사항이 없습니다.",
      "event-status",
    );
    return;
  }

  visibleNotices.forEach((notice) => {
    const link = document.createElement("a");
    link.className = "event-item";
    link.href = getNoticeDetailUrl(notice);

    const time = document.createElement("time");
    time.dateTime = notice.date;
    time.textContent = String(notice.date).replaceAll("-", ".");

    addNoticeText(link, "strong", getNoticeTitle(notice));
    if (!notice.title) addNoticeText(link, "span", notice.title_ko);
    link.prepend(time);
    homeNoticeList.append(link);
  });
};

const renderNoticeDetail = (notices) => {
  if (!noticeDetail) return;

  const params = new URLSearchParams(window.location.search);
  const requestedDate = params.get("date");
  const requestedTitle = params.get("title");
  const visibleNotices = getVisibleNotices(notices);
  const selectedNotice =
    visibleNotices.find(
      (notice) =>
        String(notice.date) === requestedDate &&
        getNoticeTitle(notice) === requestedTitle,
    ) || visibleNotices.find((notice) => String(notice.date) === requestedDate);

  noticeDetail.replaceChildren();

  if (!selectedNotice) {
    addNoticeText(
      noticeDetail,
      "p",
      "未找到该公告。 / 해당 공지사항을 찾을 수 없습니다.",
      "notice-status notice-error",
    );
    return;
  }

  document.title = `${getNoticeTitle(selectedNotice)} | KSAM`;

  const meta = document.createElement("div");
  meta.className = "notice-detail-meta";
  const time = document.createElement("time");
  time.dateTime = selectedNotice.date;
  time.textContent = String(selectedNotice.date).replaceAll("-", ".");
  meta.append(time);
  addNoticeText(
    meta,
    "span",
    selectedNotice.type || "Notice",
    "notice-type",
  );

  noticeDetail.append(meta);
  addNoticeText(noticeDetail, "h1", getNoticeTitle(selectedNotice));

  if (selectedNotice.body) {
    const richContent = document.createElement("div");
    richContent.className = "notice-rich-content";
    if (window.marked?.parse && window.DOMPurify?.sanitize) {
      const renderedBody = window.marked.parse(String(selectedNotice.body), {
        breaks: true,
        gfm: true,
      });
      richContent.innerHTML = window.DOMPurify.sanitize(renderedBody);
    } else {
      richContent.textContent = selectedNotice.body;
    }
    noticeDetail.append(richContent);
    setupNoticeImageViewer(richContent);
  } else {
    addNoticeText(
      noticeDetail,
      "p",
      selectedNotice.body_zh,
      "notice-detail-body",
    );
    addNoticeText(
      noticeDetail,
      "h2",
      selectedNotice.title_ko,
      "notice-detail-ko-title",
    );
    addNoticeText(
      noticeDetail,
      "p",
      selectedNotice.body_ko,
      "notice-detail-body ko-summary",
    );
  }
};

if (noticeList || homeNoticeList || noticeDetail) {
  fetch("./data/notices.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const notices = Array.isArray(data.notices) ? data.notices : [];
      renderNotices(notices);
      renderHomeNotices(notices);
      renderNoticeDetail(notices);
    })
    .catch(() => {
      if (noticeList) {
        noticeList.replaceChildren();
        addNoticeText(
          noticeList,
          "p",
          "公告暂时无法显示。 / 공지사항을 불러오지 못했습니다.",
          "notice-status notice-error",
        );
      }
      if (homeNoticeList) {
        homeNoticeList.replaceChildren();
        addNoticeText(
          homeNoticeList,
          "p",
          "公告暂时无法显示。 / 공지사항을 불러오지 못했습니다.",
          "event-status notice-error",
        );
      }
      if (noticeDetail) {
        noticeDetail.replaceChildren();
        addNoticeText(
          noticeDetail,
          "p",
          "公告暂时无法显示。 / 공지사항을 불러오지 못했습니다.",
          "notice-status notice-error",
        );
      }
    });
}
