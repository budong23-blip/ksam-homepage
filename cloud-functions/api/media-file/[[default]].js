import { getStore } from "@edgeone/pages-blob";

const contentTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/api\/media-file\//u, ""));
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const store = getStore({ name: "ksam-media", consistency: "strong" });
  const body = await store.get(key, { type: "arrayBuffer", consistency: "strong" });
  if (!body) return new Response("Not found", { status: 404 });

  const extension = key.split(".").pop()?.toLowerCase();
  return new Response(body, {
    headers: {
      "content-type": contentTypes[extension] || "application/octet-stream",
      "cache-control": "no-store, no-cache, max-age=0, must-revalidate",
      pragma: "no-cache",
      expires: "0",
      "x-content-type-options": "nosniff",
    },
  });
}
