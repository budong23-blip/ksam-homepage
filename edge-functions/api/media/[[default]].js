import { getStore } from "@edgeone/pages-blob";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/api\/media\//u, ""));
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const store = getStore("ksam-media");
  const body = await store.get(key, { type: "arrayBuffer" });
  if (!body) return new Response("Not found", { status: 404 });

  const extension = key.split(".").pop()?.toLowerCase();
  const contentTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  const contentType = contentTypes[extension] || "application/octet-stream";
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export function onRequest() {
  return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
}
