import { marked } from "./marked.esm.js";
import DOMPurify from "./purify.es.js";

window.marked = marked;
window.DOMPurify = DOMPurify;

await import("../../script.js?v=20260717-4");
