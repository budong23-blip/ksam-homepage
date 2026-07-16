const loginView = document.querySelector("[data-login-view]");
const loginForm = document.querySelector("[data-login-form]");
const loginMessage = document.querySelector("[data-login-message]");
const loginHeading = document.querySelector("[data-login-heading]");
const loginIntro = document.querySelector("[data-login-intro]");
const loginSubmit = document.querySelector("[data-login-submit]");
const workspace = document.querySelector("[data-admin-workspace]");
const logoutButton = document.querySelector("[data-logout]");
const saveState = document.querySelector("[data-save-state]");
const noticeList = document.querySelector("[data-admin-notice-list]");
const noticeCount = document.querySelector("[data-notice-count]");
const addButton = document.querySelector("[data-add-notice]");
const deleteButton = document.querySelector("[data-delete-notice]");
const editorForm = document.querySelector("[data-notice-editor]");
const editorHeading = document.querySelector("[data-editor-heading]");
const richEditor = document.querySelector("[data-rich-editor]");
const previewLink = document.querySelector("[data-preview-link]");
const imageInput = document.querySelector("[data-image-input]");

let notices = [];
let selectedId = null;
let dirty = false;
let loginMode = "login";

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
};

const setStatus = (message, type = "") => {
  saveState.textContent = message;
  saveState.className = `save-state${type ? ` is-${type}` : ""}`;
};

const setDirty = (value = true) => {
  dirty = value;
  if (dirty) setStatus("저장되지 않은 변경사항");
};

const selectedNotice = () => notices.find((notice) => notice.id === selectedId);

const getTitle = (notice) => notice.title || "제목 없는 공지";

const detailUrl = (notice) => {
  const params = new URLSearchParams({ date: notice.date, title: getTitle(notice) });
  return `../notice-detail.html?${params.toString()}`;
};

const renderList = () => {
  noticeList.replaceChildren();
  noticeCount.textContent = `${notices.length}개`;

  if (notices.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "등록된 공지가 없습니다.";
    noticeList.append(empty);
    return;
  }

  [...notices]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .forEach((notice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `notice-admin-item${notice.id === selectedId ? " is-active" : ""}`;
      button.dataset.noticeId = notice.id;

      const time = document.createElement("time");
      time.textContent = notice.date;
      const title = document.createElement("strong");
      title.textContent = getTitle(notice);
      button.append(time, title);

      if (notice.published === false) {
        const state = document.createElement("span");
        state.textContent = "비공개";
        button.append(state);
      }
      noticeList.append(button);
    });
};

const bodyToHtml = (body) => {
  const source = String(body || "");
  if (!source) return "";
  if (/<[a-z][\s\S]*>/iu.test(source)) return window.DOMPurify.sanitize(source);
  return window.DOMPurify.sanitize(window.marked.parse(source, { breaks: true, gfm: true }));
};

const fillEditor = (notice) => {
  selectedId = notice?.id || null;
  editorForm.hidden = !notice;
  if (!notice) return;

  editorForm.elements.date.value = notice.date || new Date().toISOString().slice(0, 10);
  editorForm.elements.type.value = notice.type || "Notice";
  editorForm.elements.pinned.checked = Boolean(notice.pinned);
  editorForm.elements.published.checked = notice.published !== false;
  editorForm.elements.title.value = notice.title || notice.title_zh || notice.title_ko || "";
  richEditor.innerHTML = bodyToHtml(
    notice.body ||
      [notice.body_zh, notice.body_ko].filter(Boolean).join("\n\n---\n\n"),
  );
  editorHeading.textContent = getTitle(notice);
  previewLink.href = detailUrl(notice);
  dirty = false;
  setStatus("저장됨", "success");
  renderList();
};

const captureEditor = () => {
  const notice = selectedNotice();
  if (!notice) return;
  notice.date = editorForm.elements.date.value;
  notice.type = editorForm.elements.type.value;
  notice.pinned = editorForm.elements.pinned.checked;
  notice.published = editorForm.elements.published.checked;
  notice.title = editorForm.elements.title.value.trim();
  notice.body = richEditor.innerHTML.trim();
  editorHeading.textContent = getTitle(notice);
  previewLink.href = detailUrl(notice);
};

const selectNotice = (id) => {
  const wasDirty = dirty;
  captureEditor();
  fillEditor(notices.find((notice) => notice.id === id));
  if (wasDirty) setDirty();
};

const loadNotices = async () => {
  setStatus("공지 불러오는 중");
  const data = await request("../api/notices");
  notices = Array.isArray(data.notices) ? data.notices : [];
  renderList();
  fillEditor(notices[0] || null);
};

const showLogin = (message = "") => {
  loginMode = "login";
  loginView.hidden = false;
  workspace.hidden = true;
  logoutButton.hidden = true;
  loginMessage.textContent = message;
  loginHeading.textContent = "관리자 로그인";
  loginIntro.hidden = true;
  loginSubmit.textContent = "로그인";
  loginForm.elements.password.autocomplete = "current-password";
  setStatus("관리자 로그인");
};

const showSetup = () => {
  loginMode = "setup";
  loginView.hidden = false;
  workspace.hidden = true;
  logoutButton.hidden = true;
  loginHeading.textContent = "첫 관리자 등록";
  loginIntro.textContent = "앞으로 사용할 관리자 아이디와 비밀번호를 정하세요. 비밀번호는 12자 이상이어야 합니다.";
  loginIntro.hidden = false;
  loginMessage.textContent = "";
  loginSubmit.textContent = "관리자 등록";
  loginForm.elements.password.autocomplete = "new-password";
  setStatus("첫 관리자 등록");
};

const showWorkspace = async () => {
  loginView.hidden = true;
  workspace.hidden = false;
  logoutButton.hidden = false;
  await loadNotices();
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  loginMessage.textContent = "";

  try {
    const form = new FormData(loginForm);
    await request(loginMode === "setup" ? "../api/setup" : "../api/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    loginForm.reset();
    await showWorkspace();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await request("../api/logout", { method: "POST", body: "{}" }).catch(() => {});
  notices = [];
  selectedId = null;
  showLogin();
});

noticeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-notice-id]");
  if (button) selectNotice(button.dataset.noticeId);
});

addButton.addEventListener("click", () => {
  captureEditor();
  const notice = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    type: "Notice",
    pinned: false,
    published: true,
    title: "",
    body: "",
  };
  notices.unshift(notice);
  fillEditor(notice);
  setDirty();
  editorForm.elements.title.focus();
});

deleteButton.addEventListener("click", () => {
  const notice = selectedNotice();
  if (!notice || !window.confirm(`'${getTitle(notice)}' 공지를 삭제할까요?`)) return;
  notices = notices.filter((item) => item.id !== notice.id);
  fillEditor(notices[0] || null);
  setDirty();
  renderList();
});

editorForm.addEventListener("input", () => {
  captureEditor();
  setDirty();
});

editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  captureEditor();
  const saveButton = editorForm.querySelector("button[type='submit']");
  saveButton.disabled = true;
  setStatus("저장 중");

  try {
    const data = await request("../api/notices", {
      method: "PUT",
      body: JSON.stringify({ notices }),
    });
    notices = data.notices;
    dirty = false;
    fillEditor(notices.find((notice) => notice.id === selectedId) || notices[0] || null);
    setStatus("저장 완료", "success");
  } catch (error) {
    setStatus(error.message, "error");
    if (/로그인/u.test(error.message)) showLogin(error.message);
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    richEditor.focus();
    document.execCommand(button.dataset.command, false);
    setDirty();
  });
});

document.querySelectorAll("[data-block]").forEach((button) => {
  button.addEventListener("click", () => {
    richEditor.focus();
    document.execCommand("formatBlock", false, button.dataset.block);
    setDirty();
  });
});

document.querySelector("[data-add-link]").addEventListener("click", () => {
  const url = window.prompt("연결할 주소를 입력하세요", "https://");
  if (!url) return;
  richEditor.focus();
  document.execCommand("createLink", false, url);
  setDirty();
});

document.querySelector("[data-add-image]").addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  imageInput.value = "";
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    setStatus("사진은 10MB 이하만 가능합니다.", "error");
    return;
  }

  setStatus("사진 업로드 중");
  try {
    const upload = await request("../api/upload-url", {
      method: "POST",
      body: JSON.stringify({ name: file.name, contentType: file.type }),
    });
    const response = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("사진 업로드에 실패했습니다.");
    richEditor.focus();
    document.execCommand("insertImage", false, upload.publicUrl);
    setDirty();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

request("../api/session")
  .then((session) => {
    if (!session.configured) {
      showSetup();
    } else if (session.authenticated) {
      showWorkspace().catch((error) => showLogin(error.message));
    } else {
      showLogin();
    }
  })
  .catch(() => showLogin("EdgeOne Functions 배포 후 로그인할 수 있습니다."));
