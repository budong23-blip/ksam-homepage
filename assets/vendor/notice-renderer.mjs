import { marked } from "./marked.esm.js";
import DOMPurify from "./purify.es.mjs";

window.marked = marked;
window.DOMPurify = DOMPurify;

await import("../../script.js");
