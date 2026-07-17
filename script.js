const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");

navToggle?.addEventListener("click", () => {
  nav?.classList.toggle("is-open");
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove("is-open");
    nav.querySelectorAll("[data-nav-dropdown]").forEach((dropdown) => {
      dropdown.classList.remove("is-open");
      dropdown
        .querySelector("[data-submenu-toggle]")
        ?.setAttribute("aria-expanded", "false");
    });
  }
});

const submenuToggles = document.querySelectorAll("[data-submenu-toggle]");

submenuToggles.forEach((toggle) => {
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const dropdown = toggle.closest("[data-nav-dropdown]");
    const willOpen = !dropdown?.classList.contains("is-open");

    document.querySelectorAll("[data-nav-dropdown]").forEach((item) => {
      item.classList.remove("is-open");
      item
        .querySelector("[data-submenu-toggle]")
        ?.setAttribute("aria-expanded", "false");
    });

    if (willOpen && dropdown) {
      dropdown.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    }
  });
});

document.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("[data-nav-dropdown]")) {
    return;
  }
  document.querySelectorAll("[data-nav-dropdown]").forEach((dropdown) => {
    dropdown.classList.remove("is-open");
    dropdown
      .querySelector("[data-submenu-toggle]")
      ?.setAttribute("aria-expanded", "false");
  });
});

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const conferencePopup = document.querySelector("[data-conference-popup]");

if (conferencePopup instanceof HTMLDialogElement) {
  const popupDateKey = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();
  const popupStorageKey = "ksam-conference-2026-08-19-hidden-date";
  let hiddenDate = "";

  try {
    hiddenDate = window.localStorage.getItem(popupStorageKey) || "";
  } catch {
    hiddenDate = "";
  }

  if (hiddenDate !== popupDateKey) {
    window.requestAnimationFrame(() => conferencePopup.showModal());
  }

  conferencePopup
    .querySelector("[data-popup-close]")
    ?.addEventListener("click", () => conferencePopup.close());

  conferencePopup
    .querySelector("[data-popup-hide-today]")
    ?.addEventListener("click", () => {
      try {
        window.localStorage.setItem(popupStorageKey, popupDateKey);
      } catch {
        // The popup can still be closed when storage is unavailable.
      }
      conferencePopup.close();
    });

  conferencePopup.addEventListener("click", (event) => {
    if (event.target === conferencePopup) conferencePopup.close();
  });
}

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
    v: "20260717-3",
  });
  return `./notice-detail.html?${detailParams.toString()}`;
};

const mediaCacheVersion = "20260717-2";

const refreshNoticeImageUrls = (container) => {
  container.querySelectorAll('img[src^="/api/media-file/"]').forEach((image) => {
    const url = new URL(image.getAttribute("src"), window.location.origin);
    url.searchParams.set("v", mediaCacheVersion);
    image.src = `${url.pathname}${url.search}`;
  });
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
  let fittedWidth = 0;
  let fittedHeight = 0;
  let maxScale = 5;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  const activePointers = new Map();
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let pinchStartCenterX = 0;
  let pinchStartCenterY = 0;
  let pinchStartOffsetX = 0;
  let pinchStartOffsetY = 0;
  let ignoreStageClickUntil = 0;

  const getPointerPair = () => [...activePointers.values()].slice(0, 2);
  const getPointerDistance = ([first, second]) =>
    Math.hypot(second.x - first.x, second.y - first.y);
  const getPointerCenter = ([first, second]) => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  });

  const updateTransform = () => {
    if (fittedWidth > 0 && fittedHeight > 0) {
      viewerImage.style.width = `${fittedWidth * scale}px`;
      viewerImage.style.height = `${fittedHeight * scale}px`;
      viewerImage.classList.add("is-render-sized");
    }
    viewerImage.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    resetButton.textContent = `${Math.round(scale * 100)}%`;
    viewerImage.classList.toggle("is-draggable", scale > 1);
  };

  const fitImageToStage = () => {
    if (!viewerImage.naturalWidth || !viewerImage.naturalHeight) return;

    const stageStyle = window.getComputedStyle(stage);
    const availableWidth =
      stage.clientWidth -
      Number.parseFloat(stageStyle.paddingLeft) -
      Number.parseFloat(stageStyle.paddingRight);
    const availableHeight =
      stage.clientHeight -
      Number.parseFloat(stageStyle.paddingTop) -
      Number.parseFloat(stageStyle.paddingBottom);
    const fitRatio = Math.min(
      availableWidth / viewerImage.naturalWidth,
      availableHeight / viewerImage.naturalHeight,
      1,
    );

    fittedWidth = Math.max(1, viewerImage.naturalWidth * fitRatio);
    fittedHeight = Math.max(1, viewerImage.naturalHeight * fitRatio);
    maxScale = Math.max(
      5,
      Math.min(
        20,
        viewerImage.naturalWidth /
          (fittedWidth * Math.min(window.devicePixelRatio || 1, 3)),
      ),
    );
    updateTransform();
  };

  const setZoom = (nextScale) => {
    scale = Math.min(maxScale, Math.max(0.5, nextScale));
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
    viewerImage.style.removeProperty("width");
    viewerImage.style.removeProperty("height");
    viewerImage.style.removeProperty("transform");
    document.body.classList.remove("has-image-viewer");
    activePointers.clear();
    dragging = false;
    fittedWidth = 0;
    fittedHeight = 0;
    maxScale = 5;
    viewerImage.classList.remove("is-dragging", "is-gesturing", "is-render-sized");
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
    if (viewerImage.complete) fitImageToStage();
    closeButton.focus();
  };

  viewerImage.addEventListener("load", fitImageToStage);

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
    if (Date.now() < ignoreStageClickUntil) return;
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
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.pointerType !== "mouse" || scale > 1) event.preventDefault();

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional on older mobile browsers.
    }

    if (activePointers.size >= 2) {
      const pair = getPointerPair();
      const center = getPointerCenter(pair);
      pinchStartDistance = Math.max(1, getPointerDistance(pair));
      pinchStartScale = scale;
      pinchStartCenterX = center.x;
      pinchStartCenterY = center.y;
      pinchStartOffsetX = offsetX;
      pinchStartOffsetY = offsetY;
      dragging = false;
      viewerImage.classList.remove("is-dragging");
      viewerImage.classList.add("is-gesturing");
      ignoreStageClickUntil = Date.now() + 350;
      return;
    }

    if (scale > 1) {
      dragging = true;
      dragStartX = event.clientX - offsetX;
      dragStartY = event.clientY - offsetY;
      viewerImage.classList.add("is-dragging");
    }
  });

  stage.addEventListener("pointermove", (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.size >= 2) {
      event.preventDefault();
      const pair = getPointerPair();
      const center = getPointerCenter(pair);
      const nextScale = Math.min(
        maxScale,
        Math.max(0.5, pinchStartScale * (getPointerDistance(pair) / pinchStartDistance)),
      );

      scale = nextScale;
      if (scale <= 1) {
        offsetX = 0;
        offsetY = 0;
      } else {
        offsetX = pinchStartOffsetX + center.x - pinchStartCenterX;
        offsetY = pinchStartOffsetY + center.y - pinchStartCenterY;
      }
      ignoreStageClickUntil = Date.now() + 350;
      updateTransform();
      return;
    }

    if (!dragging || scale <= 1) return;
    event.preventDefault();
    offsetX = event.clientX - dragStartX;
    offsetY = event.clientY - dragStartY;
    ignoreStageClickUntil = Date.now() + 350;
    updateTransform();
  });

  const stopPointerGesture = (event) => {
    const wasPinching = activePointers.size >= 2;
    activePointers.delete(event.pointerId);
    try {
      if (stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The pointer may already have been released by the browser.
    }

    viewerImage.classList.toggle("is-gesturing", activePointers.size >= 2);
    const remainingPointer = activePointers.values().next().value;
    if (remainingPointer && scale > 1) {
      dragging = true;
      dragStartX = remainingPointer.x - offsetX;
      dragStartY = remainingPointer.y - offsetY;
      viewerImage.classList.add("is-dragging");
    } else {
      dragging = false;
      viewerImage.classList.remove("is-dragging");
    }

    if (wasPinching) ignoreStageClickUntil = Date.now() + 350;
  };

  stage.addEventListener("pointerup", stopPointerGesture);
  stage.addEventListener("pointercancel", stopPointerGesture);
  viewerImage.addEventListener("dblclick", resetZoom);
  window.addEventListener("resize", () => {
    if (viewer.hidden) return;
    resetZoom();
    fitImageToStage();
  });

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
      const normalizedBody = String(selectedNotice.body).replaceAll(
        'src="/api/media/',
        'src="/api/media-file/',
      );
      const renderedBody = window.marked.parse(normalizedBody, {
        breaks: true,
        gfm: true,
      });
      richContent.innerHTML = window.DOMPurify.sanitize(renderedBody);
      refreshNoticeImageUrls(richContent);
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
  let noticesLoaded = false;

  const loadNotices = () => {
    const apiUrl = new URL("./api/notices", window.location.href);
    const fallbackUrl = new URL("./data/notices.json", window.location.href);
    apiUrl.searchParams.set("updated", Date.now().toString());
    fallbackUrl.searchParams.set("updated", Date.now().toString());

    const fetchJson = (url) =>
      fetch(url, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        });

    return fetchJson(apiUrl)
      .catch(() => fetchJson(fallbackUrl))
      .then((response) => {
        const notices = Array.isArray(response.notices) ? response.notices : [];
        renderNotices(notices);
        renderHomeNotices(notices);
        renderNoticeDetail(notices);
        noticesLoaded = true;
      })
      .catch(() => {
        if (noticesLoaded) return;

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
  };

  loadNotices();
  window.setInterval(loadNotices, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadNotices();
  });
}
