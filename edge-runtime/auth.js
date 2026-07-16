const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

export const hasAdminConfig = (env) =>
  Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD && env.SESSION_SECRET);

export const credentialsMatch = (env, username, password) =>
  hasAdminConfig(env) &&
  constantTimeEqual(username, env.ADMIN_USERNAME) &&
  constantTimeEqual(password, env.ADMIN_PASSWORD);

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
  if (!hasAdminConfig(env)) return null;
  const token = getCookie(request, "ksam_admin");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await sign(payload, env.SESSION_SECRET);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
    const decoded = JSON.parse(decoder.decode(bytes));
    if (decoded.expires < Date.now()) return null;
    if (!constantTimeEqual(decoded.username, env.ADMIN_USERNAME)) return null;
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
