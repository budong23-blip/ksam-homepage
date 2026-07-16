import { getStore } from "@edgeone/pages-blob";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const AUTH_STORE = "ksam-content";
const AUTH_KEY = "private/admin-config.json";
const PASSWORD_ITERATIONS = 150000;

const toBase64Url = (value) => {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const sign = async (value, secret) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
};

const randomBase64Url = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

const hashPassword = async (password, salt) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return toBase64Url(new Uint8Array(bits));
};

const constantTimeEqual = (left, right) => {
  const leftBytes = encoder.encode(String(left));
  const rightBytes = encoder.encode(String(right));
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
};

const getCookie = (request, name) => {
  const cookies = request.headers.get("cookie") || "";
  const prefix = `${name}=`;
  const match = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
};

export const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });

export const getAdminConfig = async (env = {}) => {
  if (env.ADMIN_USERNAME && env.ADMIN_PASSWORD && env.SESSION_SECRET) {
    return {
      username: env.ADMIN_USERNAME,
      password: env.ADMIN_PASSWORD,
      sessionSecret: env.SESSION_SECRET,
      source: "environment",
    };
  }

  const store = getStore({ name: AUTH_STORE, consistency: "strong" });
  const config = await store.get(AUTH_KEY, { type: "json", consistency: "strong" });
  if (!config?.username || !config?.passwordHash || !config?.salt || !config?.sessionSecret) {
    return null;
  }
  return { ...config, source: "blob" };
};

export const hasAdminConfig = async (env) => Boolean(await getAdminConfig(env));

export const createAdminConfig = async (username, password) => {
  const cleanUsername = String(username || "").trim();
  const cleanPassword = String(password || "");
  if (!/^[A-Za-z0-9_.@-]{3,64}$/u.test(cleanUsername)) {
    throw new Error("아이디는 영문, 숫자, . _ - @ 조합으로 3~64자여야 합니다.");
  }
  if (cleanPassword.length < 12 || cleanPassword.length > 200) {
    throw new Error("비밀번호는 12자 이상 200자 이하로 입력하세요.");
  }

  const existing = await getAdminConfig({});
  if (existing) throw new Error("관리자 계정이 이미 등록되어 있습니다.");

  const salt = randomBase64Url(16);
  const config = {
    username: cleanUsername,
    salt,
    passwordHash: await hashPassword(cleanPassword, salt),
    sessionSecret: randomBase64Url(32),
    createdAt: new Date().toISOString(),
  };
  const store = getStore({ name: AUTH_STORE, consistency: "strong" });
  await store.setJSON(AUTH_KEY, config);

  const saved = await getAdminConfig({});
  if (
    !saved ||
    !constantTimeEqual(saved.username, cleanUsername) ||
    !constantTimeEqual(saved.passwordHash, config.passwordHash)
  ) {
    throw new Error("관리자 계정을 등록하지 못했습니다. 다시 시도하세요.");
  }
  return saved;
};

export const credentialsMatch = async (config, username, password) => {
  if (!config || !constantTimeEqual(username, config.username)) return false;
  if (config.source === "environment") {
    return constantTimeEqual(password, config.password);
  }
  const candidate = await hashPassword(String(password || ""), config.salt);
  return constantTimeEqual(candidate, config.passwordHash);
};

export const createSessionToken = async (username, secret) => {
  const payload = toBase64Url(
    JSON.stringify({
      username,
      expires: Date.now() + 8 * 60 * 60 * 1000,
    }),
  );
  return `${payload}.${await sign(payload, secret)}`;
};

export const getAdminSession = async (request, env) => {
  const config = await getAdminConfig(env);
  if (!config) return null;
  const token = getCookie(request, "ksam_admin");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await sign(payload, config.sessionSecret);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
    const decoded = JSON.parse(decoder.decode(bytes));
    if (decoded.expires < Date.now()) return null;
    if (!constantTimeEqual(decoded.username, config.username)) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const sessionCookie = (token) =>
  `ksam_admin=${encodeURIComponent(token)}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict`;

export const clearSessionCookie = () =>
  "ksam_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict";

export const isSameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
};
