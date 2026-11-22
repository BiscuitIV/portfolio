// Local content editor for the portfolio (editor.html). Not deployed: listed in .vercelignore.
// Reads and writes two files in the site folder through the File System Access API (Chrome, Edge):
//  - content.js: `const updates = <strict JSON>;` (the home panel's feed) and `const projects = <strict JSON>;`,
//    each parsed and rewritten whole; the comment lines above them are kept
//  - index.html: only the text between `<!-- edit:name -->` and `<!-- /edit:name -->` markers,
//    plus the two description <meta> tags and the og:image tags; everything else stays byte-identical.
// Edits live in the page until Save. Leaving a page commits its edits to the in-memory copy.
"use strict";

// Names in the `figures` registry in script.js; keep in step with it
const FIGURES = ["airfoils", "polars", "timeline", "sweep", "reynolds"];
const PREFIX = "const projects = ";
const UPDATES_PREFIX = "const updates = ";
const REGION_RE = /<!-- edit:([\w-]+) -->\n([\s\S]*?)\n([ \t]*)<!-- \/edit:\1 -->/g;
const REGION_LABELS = {
    lede: "Value prop", bio: "Bio", education: "Education", experience: "Experience",
    skills: "Skills", activities: "Activities", headshot: "About portrait", about: "About text"
};
const META = [
    ["description", /(<meta name="description" content=")([^"]*)(">)/, "Search description"],
    ["og", /(<meta property="og:description" content=")([^"]*)(">)/, "Link-preview description"]
];
// Key order for fields a project didn't have before; existing keys keep their order
const FIELD_ORDER = ["hidden", "title", "subtitle", "outcome", "thumb", "tags", "date", "problem", "role", "tools",
    "results", "video", "image", "specs", "text"];
const MEDIA_EXT = /\.(jpe?g|png|webp|gif|svg|mp4)$/i;
const SKIP_DIRS = new Set([".git", ".vscode", ".claude", "node_modules", "graphify-out"]);

const state = {
    dir: null,
    contentText: "",     // content.js as last read or written
    html: "",            // index.html as last read or written
    projects: null,      // working copy, committed views included
    workingHtml: "",     // working copy of index.html, committed home edits included
    updates: null,       // working copy of `updates`, or null when content.js has no such block
    contentDirty: false,
    htmlDirty: false,
    view: null,          // { key, dirty, commit() }
    files: null          // cached media paths in the folder
};

const $ = id => document.getElementById(id);

// ---------- Small DOM helpers ----------

function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "text") el.textContent = v;
        else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
    }
    el.append(...kids.flat().filter(k => k != null && k !== false));
    return el;
}

const btn = (label, onclick, cls = "bare mono chip ed-btn ed-btn-sm", title) =>
    h("button", { type: "button", class: cls, onclick, title, "aria-label": title }, label);

function caretTo(el, atEnd) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(!atEnd);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function caretAtStart(el) {
    const sel = getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return false;
    const r = document.createRange();
    r.selectNodeContents(el);
    r.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    return r.toString().length === 0;
}

const isEmpty = el => el.textContent.replace(/​/g, "").trim() === "" && !el.querySelector("img");

const escAttr = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function unescAttr(s) {
    const t = document.createElement("textarea");
    t.innerHTML = s;
    return t.value;
}

// ---------- Inline HTML: what paragraphs, list items, results, outcomes and captions may hold ----------

// Rebuilds an editable's children with only <strong>, <em> and <a class="link">; everything else is unwrapped
function cleanInline(root) {
    const out = document.createDocumentFragment();
    const walk = (node, parent) => {
        for (const n of [...node.childNodes]) {
            if (n.nodeType === Node.TEXT_NODE) { parent.append(n.textContent); continue; }
            if (n.nodeType !== Node.ELEMENT_NODE) continue;
            const tag = n.tagName.toLowerCase();
            let el = null;
            if (tag === "b" || tag === "strong") el = document.createElement("strong");
            else if (tag === "i" || tag === "em") el = document.createElement("em");
            else if (tag === "a" && n.getAttribute("href")) el = makeLink(n.getAttribute("href"));
            else if (tag === "br") { parent.append(" "); continue; }
            if (el) { walk(n, el); if (el.textContent) parent.append(el); }
            else walk(n, parent);
        }
    };
    walk(root, out);
    const tmp = document.createElement("div");
    tmp.append(out);
    tmp.normalize();
    return tmp.innerHTML
        .replace(/&nbsp;/g, " ")       // contenteditable pads spaces with nbsp
        .replace(/ {2,}/g, " ")
        .replace(/<\/strong><strong>|<\/em><em>/g, "")
        .trim();
}

function makeLink(href) {
    const a = document.createElement("a");
    a.setAttribute("class", "link");
    a.setAttribute("href", href);
    if (/^https?:|\.pdf$/i.test(href)) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
    }
    return a;
}

// ---------- Editable text ----------

// A contenteditable field. rich: keeps inline markup (value is HTML); otherwise plain text.
// Returns the element with .value() that gives back the original string when untouched.
function editable(tag, value, { rich = false, cls = "", placeholder = "", onEnter, onBackspaceEmpty, onInput } = {}) {
    const el = h(tag, { class: cls, contenteditable: rich ? "true" : "plaintext-only", spellcheck: "true",
        "data-placeholder": placeholder, "data-rich": rich ? "" : null });
    if (rich) el.innerHTML = value || ""; else el.textContent = value || "";
    const orig = value || "";
    let touched = false;
    el.addEventListener("input", () => { touched = true; if (isEmpty(el)) el.innerHTML = ""; markDirty(); onInput?.(); });
    el.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            onEnter?.(e);
        } else if (e.key === "Enter") {
            e.preventDefault();      // no line breaks inside a field
        } else if (e.key === "Backspace" && onBackspaceEmpty && isEmpty(el)) {
            e.preventDefault();
            onBackspaceEmpty(e);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && rich) {
            e.preventDefault();
            addLink();
        }
    });
    el.addEventListener("paste", e => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " ");
        document.execCommand("insertText", false, text);
    });
    // defineProperty, not assignment: <li> has a native numeric `value` that would swallow the function
    Object.defineProperty(el, "value", { value: () => !touched ? orig : rich ? cleanInline(el) : el.textContent.replace(/ /g, " ").replace(/\s+/g, " ").trim() });
    el.touch = () => { touched = true; };
    return el;
}

// ---------- Format toolbar (bold, italic, link) for rich fields ----------

const formatBar = h("div", { class: "ed-pop", hidden: true, role: "toolbar", "aria-label": "Format" },
    h("button", { type: "button", class: "bare mono", title: "Bold (Ctrl+B)", onmousedown: e => { e.preventDefault(); document.execCommand("bold"); touchActive(); } }, h("strong", {}, "B")),
    h("button", { type: "button", class: "bare mono", title: "Italic (Ctrl+I)", onmousedown: e => { e.preventDefault(); document.execCommand("italic"); touchActive(); } }, h("em", {}, "I")),
    h("button", { type: "button", class: "bare mono", title: "Link (Ctrl+K)", onmousedown: e => { e.preventDefault(); addLink(); } }, "Link"),
    h("button", { type: "button", class: "bare mono", title: "Remove link and formatting", onmousedown: e => { e.preventDefault(); document.execCommand("unlink"); document.execCommand("removeFormat"); touchActive(); } }, "Clear"));
document.body.append(formatBar);

function activeRich() {
    const sel = getSelection();
    if (!sel.rangeCount) return null;
    const node = sel.anchorNode;
    const el = (node?.nodeType === 1 ? node : node?.parentElement)?.closest("[data-rich]");
    return el || null;
}

function touchActive() {
    const el = activeRich();
    if (el) { el.touch?.(); markDirty(); }
}

function addLink() {
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) { setStatus("Select some text first, then add the link."); return; }
    const range = sel.getRangeAt(0);
    const url = prompt("Link address (https://…, mailto:…, or a file path like lws-x/ESC%20V1.pdf):");
    if (!url) return;
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("createLink", false, url.trim());
    touchActive();
}

document.addEventListener("selectionchange", () => {
    const sel = getSelection();
    const el = activeRich();
    if (!el || sel.isCollapsed || !sel.rangeCount) { formatBar.hidden = true; return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    formatBar.hidden = false;
    formatBar.style.left = `${Math.max(8, rect.left + scrollX + rect.width / 2 - formatBar.offsetWidth / 2)}px`;
    formatBar.style.top = `${rect.top + scrollY - formatBar.offsetHeight - 8}px`;
});

// ---------- Menus ----------

let openMenu = null;
function showMenu(anchor, items) {
    closeMenu();
    const menu = h("div", { class: "ed-menu mono", role: "menu" },
        items.map(it => it === "-" ? h("hr") : h("button", { type: "button", class: "bare mono", role: "menuitem",
            onclick: () => { closeMenu(); it[1](); } }, it[0])));
    document.body.append(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.left = `${r.left + scrollX}px`;
    menu.style.top = `${r.bottom + scrollY + 4}px`;
    openMenu = menu;
    menu.querySelector("button")?.focus();
    setTimeout(() => document.addEventListener("pointerdown", outside), 0);
    function outside(e) { if (!menu.contains(e.target)) closeMenu(); }
    menu._off = () => document.removeEventListener("pointerdown", outside);
    menu.addEventListener("keydown", e => { if (e.key === "Escape") { closeMenu(); anchor.focus(); } });
}
function closeMenu() { openMenu?._off(); openMenu?.remove(); openMenu = null; }

// ---------- Status, dirty state ----------

function setStatus(text, isError = false) {
    const s = $("ed-status");
    s.textContent = text;
    s.classList.toggle("ed-status-err", isError);
}

function markDirty() {
    if (state.view) state.view.dirty = true;
    refreshDirty();
}

function anyDirty() { return state.contentDirty || state.htmlDirty || !!state.view?.dirty; }

function refreshDirty() {
    const dirty = anyDirty();
    $("ed-save").disabled = !state.projects || !dirty;
    const s = $("ed-status");
    if (dirty && !s.classList.contains("ed-status-err")) s.innerHTML = `<span class="ed-dot"></span>Unsaved changes`;
}

addEventListener("beforeunload", e => { if (anyDirty()) e.preventDefault(); });

// ---------- Files ----------

// Two ways to reach the files:
//  - folder mode (dir is a handle): File System Access API, reads and writes in place (Chrome, Edge,
//    Brave with brave://flags/#file-system-access-api enabled)
//  - download mode (dir is null): reads through the local server, saves by downloading the changed
//    files, which then replace the ones in the site folder (any browser, Brave by default)
const canWriteFolder = "showDirectoryPicker" in window;

// ignoreBOM keeps a byte-order mark as U+FEFF, so writing the string back keeps it
const decode = buf => new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf);

async function readText(dir, name) {
    if (!dir) {
        let res;
        try { res = await fetch(name, { cache: "no-store" }); } catch { res = null; }
        if (!res?.ok) throw new Error(`Couldn't load ${name}. Open the editor through Live Server (http://localhost:5501/editor.html), not as a file.`);
        return decode(await res.arrayBuffer());
    }
    let file;
    try { file = await (await dir.getFileHandle(name)).getFile(); }
    catch { throw new Error(`${name} isn't in “${dir.name}”. Pick the portfolio's root folder.`); }
    return decode(await file.arrayBuffer());
}

async function writeText(dir, name, text) {
    if (!dir) {
        const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })), download: name });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        return;
    }
    const w = await (await dir.getFileHandle(name)).createWritable();
    await w.write(text);
    await w.close();
}

// Where the JSON starts: the PREFIX at the start of a line, so comments that mention it don't count
const prefixAt = text => (text.match(new RegExp(`^${PREFIX}`, "m"))?.index ?? -1);

function parseContent(text) {
    const i = prefixAt(text), j = text.lastIndexOf(";");
    if (i < 0 || j < i) throw new Error(`content.js must contain “${PREFIX}{…};”.`);
    try { return JSON.parse(text.slice(i + PREFIX.length, j)); }
    catch (err) { throw new Error(`content.js isn't strict JSON after “${PREFIX}” (${err.message}). Remove comments, trailing commas or expressions.`); }
}

// The `updates` JSON sits above `projects`: from its prefix (at the start of a line) to the last ";" before PREFIX.
// Returns [start, end] of the JSON text, or null when content.js has no updates block.
function updatesSpan(text) {
    const i = text.match(new RegExp(`^${UPDATES_PREFIX}`, "m"))?.index ?? -1;
    const p = prefixAt(text);
    if (i < 0 || p < i) return null;
    const j = text.lastIndexOf(";", p);
    return j > i ? [i + UPDATES_PREFIX.length, j] : null;
}

function parseUpdates(text) {
    const span = updatesSpan(text);
    if (!span) return null;
    try { return JSON.parse(text.slice(...span)); }
    catch (err) { throw new Error(`content.js isn't strict JSON after “${UPDATES_PREFIX}” (${err.message}). Remove comments, trailing commas or expressions.`); }
}

function serializeContent(projects) {
    const t = state.contentText;
    const i = prefixAt(t), j = t.lastIndexOf(";");
    let head = t.slice(0, i);
    const span = updatesSpan(t);
    if (span && state.updates) head = head.slice(0, span[0]) + JSON.stringify(state.updates, null, 4) + head.slice(span[1]);
    return head + PREFIX + JSON.stringify(projects, null, 4) + t.slice(j);
}

function regions(html) {
    const out = {};
    for (const m of html.matchAll(REGION_RE)) out[m[1]] = m[2];
    return out;
}

const idb = (mode, fn) => new Promise((resolve, reject) => {
    const open = indexedDB.open("portfolio-editor", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
        const tx = open.result.transaction("kv", mode);
        const req = fn(tx.objectStore("kv"));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
    };
});

async function openFolder(handle) {
    try {
        if (!canWriteFolder) handle = null;
        else {
            if (!handle) handle = await showDirectoryPicker({ id: "portfolio", mode: "readwrite" });
            if (await handle.queryPermission({ mode: "readwrite" }) !== "granted" &&
                await handle.requestPermission({ mode: "readwrite" }) !== "granted") throw new Error("Write access to the folder wasn't granted.");
        }
        const [contentText, html] = await Promise.all([readText(handle, "content.js"), readText(handle, "index.html")]);
        const projects = parseContent(contentText);
        const updates = parseUpdates(contentText);
        const found = Object.keys(regions(html));
        if (!found.length) throw new Error("index.html has no <!-- edit:… --> markers.");
        Object.assign(state, { dir: handle, contentText, html, projects, updates, workingHtml: html,
            contentDirty: false, htmlDirty: false, view: null, files: null });
        if (handle) {
            idb("readwrite", s => s.put(handle, "dir")).catch(() => {});
            $("ed-folder").textContent = handle.name;
            $("ed-open").textContent = "Change folder";
        } else {
            $("ed-folder").textContent = "Download mode";
            $("ed-open").textContent = "Reload files";
            $("ed-save").textContent = "Download changes";
        }
        if (handle) setStatus("");   // download mode keeps its how-to-save note
        renderNav();
        go(location.hash.slice(1) || "home");
    } catch (err) {
        if (err.name !== "AbortError") setStatus(err.message, true);
    }
}

async function save() {
    if (!state.projects) return;
    try {
        state.view?.commit();
        // Refuse to overwrite edits made on disk since the files were read. In download mode the
        // folder only changes when the downloads are moved in, so there is nothing to compare.
        if (state.dir) {
            const [diskContent, diskHtml] = await Promise.all([readText(state.dir, "content.js"), readText(state.dir, "index.html")]);
            const changed = [diskContent !== state.contentText && state.contentDirty && "content.js",
                diskHtml !== state.html && state.htmlDirty && "index.html"].filter(Boolean);
            if (changed.length && !confirm(`${changed.join(" and ")} changed on disk since the editor read it. Overwrite those changes?`)) {
                setStatus("Save cancelled. Reload the page to pick up the changes on disk.", true);
                return;
            }
        }
        const written = [];
        if (state.contentDirty) {
            const text = serializeContent(state.projects);
            await writeText(state.dir, "content.js", text);
            state.contentText = text;
            state.contentDirty = false;
            written.push("content.js");
        }
        if (state.htmlDirty) {
            await writeText(state.dir, "index.html", state.workingHtml);
            state.html = state.workingHtml;
            state.htmlDirty = false;
            written.push("index.html");
        }
        if (state.view) state.view.dirty = false;
        const time = new Date().toLocaleTimeString();
        setStatus(!written.length ? "No changes to save"
            : state.dir ? `Saved ${written.join(" and ")} · ${time}`
            : `Downloaded ${written.join(" and ")} · ${time}. Move them into the site folder, replacing the old ones.`);
        refreshDirty();
        lint();
    } catch (err) {
        setStatus(`Save failed: ${err.message}`, true);
    }
}

async function listMedia() {
    if (state.files) return state.files;
    if (!state.dir) {
        // Download mode can't list the folder: offer every path the site already uses
        const used = new Set();
        const add = src => { if (src && MEDIA_EXT.test(src)) used.add(fromSrc(src)); };
        const walk = items => (items || []).forEach(it => { it?.media?.forEach(m => add(m.src)); if (it?.fold) walk(it.text); });
        for (const p of Object.values(state.projects)) { add(p.thumb); add(p.video); add(p.image?.src); walk(p.text); }
        for (const m of state.workingHtml.matchAll(/src="([^"]+)"/g)) add(m[1]);
        state.files = [...used].sort((a, b) => a.localeCompare(b));
        return state.files;
    }
    const files = [];
    async function walk(dir, prefix) {
        for await (const [name, handle] of dir.entries()) {
            if (handle.kind === "directory") { if (!SKIP_DIRS.has(name)) await walk(handle, `${prefix}${name}/`); }
            else if (MEDIA_EXT.test(name)) files.push(prefix + name);
        }
    }
    await walk(state.dir, "");
    state.files = files.sort((a, b) => a.localeCompare(b));
    return state.files;
}

// Spaces as %20, as in the existing src strings built in JS
const toSrc = path => encodeURI(path);
const fromSrc = src => { try { return decodeURI(src); } catch { return src; } };

function pickFile(filter = MEDIA_EXT) {
    return new Promise(async resolve => {
        const dialog = $("ed-picker"), grid = $("ed-picker-grid"), input = $("ed-picker-filter");
        const files = (await listMedia()).filter(f => filter.test(f));
        let chosen = null;
        const draw = () => {
            const typed = input.value.trim().replace(/^\.?\//, "");
            const q = typed.toLowerCase();
            const matches = files.filter(f => f.toLowerCase().includes(q));
            // A typed path that isn't listed (a new file in download mode) can still be used
            const useTyped = typed && filter.test(typed) && !matches.includes(typed)
                ? h("button", { type: "button", class: "bare mono-data", onclick: () => { chosen = typed; dialog.close(); } },
                    h("span", { class: "ed-vid mono muted" }, "Use path"), h("span", {}, typed))
                : null;
            grid.replaceChildren(...[useTyped, ...matches.slice(0, 300).map(f =>
                h("button", { type: "button", class: "bare mono-data", onclick: () => { chosen = f; dialog.close(); } },
                    f.endsWith(".mp4") ? h("span", { class: "ed-vid mono muted" }, "Clip") : h("img", { src: toSrc(f), loading: "lazy", alt: "" }),
                    h("span", {}, f)))].filter(Boolean));
        };
        input.value = "";
        input.oninput = draw;
        draw();
        dialog.onclose = () => resolve(chosen);
        dialog.showModal();
        input.focus();
    });
}

function measure(src) {
    return new Promise(resolve => {
        if (/\.mp4$/i.test(src)) {
            const v = document.createElement("video");
            v.preload = "metadata";
            v.onloadedmetadata = () => resolve({ width: v.videoWidth, height: v.videoHeight });
            v.onerror = () => resolve(null);
            v.src = src;
        } else {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = src;
        }
    });
}

// ---------- Navigation ----------

function renderNav() {
    const keys = Object.keys(state.projects);
    const item = (key, label, note) => h("button", { type: "button", class: "bare mono", "data-key": key, onclick: () => go(key) },
        label, note && h("span", { class: "muted" }, ` · ${note}`));
    $("ed-nav").replaceChildren(
        h("p", { class: "mono muted ed-nav-label" }, "Home"),
        item("home", "Home page"),
        h("p", { class: "mono muted ed-nav-label" }, "Projects"),
        ...keys.map(k => item(k, state.projects[k].title || k, state.projects[k].hidden && "hidden")),
        h("button", { type: "button", class: "bare mono muted", onclick: newProject }, "+ New project"));
    markNav();
}

function markNav() {
    for (const b of $("ed-nav").querySelectorAll("[data-key]")) {
        if (b.dataset.key === state.view?.key) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    }
}

function go(key) {
    if (!state.projects) return;
    if (key !== "home" && !state.projects[key]) key = "home";
    state.view?.commit();
    closeMenu();
    formatBar.hidden = true;
    history.replaceState(null, "", `#${key}`);
    const main = $("ed-main");
    main.replaceChildren();
    state.view = key === "home" ? homeView(main) : projectView(main, key);
    markNav();
    $("ed-view").href = key === "home" ? "index.html" : `index.html#${key}`;
    scrollTo(0, 0);
    refreshDirty();
}

function newProject() {
    const key = prompt("Short id for the new project, used in its URL (for example “wind-tunnel”):");
    if (!key) return;
    const id = key.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!id || state.projects[id] || id === "home") { setStatus(`“${id}” is empty or already used.`, true); return; }
    state.view?.commit();
    state.projects[id] = { hidden: true, title: "New project", text: ["<strong>This project</strong> is…"] };
    state.contentDirty = true;
    state.view = null;
    renderNav();
    go(id);
    setStatus("New project added, hidden until you untick “Hidden”.");
    refreshDirty();
}

// ---------- Home page view ----------

function homeView(main) {
    const view = { key: "home", dirty: false, commit };
    const parts = regions(state.workingHtml);
    const editors = {};

    const doc = h("div", { class: "ed-doc" });
    main.append(doc);

    // Description meta tags
    const metaInputs = [];
    const metaFields = META.map(([, re, label]) => {
        const m = state.workingHtml.match(re);
        if (!m) return null;
        const input = h("textarea", { class: "ed-input", rows: 2, oninput: () => { input.dirty = true; markDirty(); } });
        input.value = unescAttr(m[2]);
        input._re = re;
        metaInputs.push(input);
        return field(label, input);
    });
    doc.append(section("Page", "Shown by search engines and link previews, not on the page itself.", metaFields),
        h("p", { class: "mono muted ed-hint" },
            "Click any text to edit it. Hover an entry or skill for move, duplicate (how you add one) and delete. Enter in a bullet starts a new one."));

    // The idle panel's feed (`updates` in content.js), then home-page images outside the résumé regions:
    // each index row's thumbnail (in content.js) and the link-preview card (the og:image tags)
    const feed = state.updates && updatesEditor(state.updates);
    if (feed) doc.append(section("Recent updates",
        "Newest first. The panel beside the index shows the newest one's image (or its linked part's) and its date and title as a link; phones show the newest image under the bio.",
        feed.el));
    const thumbs = Object.entries(state.projects).filter(([, p]) => !p.hidden).map(([key, p]) => {
        const preview = h("img", { class: "ed-thumb", src: p.thumb || "", alt: "", hidden: !p.thumb });
        const path = pathField(p.thumb || "", "Image path", IMAGE_EXT, v => { preview.src = v; preview.hidden = !v; });
        return { key, value: path.value, el: field(p.title || key, h("div", { class: "ed-row" }, preview, path.el)) };
    });
    doc.append(section("Index thumbnails", "One per index row; a row without one shows an empty box.", ...thumbs.map(t => t.el)));
    const social = socialCardFields(() => { social.dirty = true; markDirty(); });
    if (social) doc.append(section("Link preview", "The card shown when the site is shared. 1200 × 630 works best.", ...social.el));

    for (const [name, body] of Object.entries(parts)) {
        const region = h("div", { class: `ed-region${name === "about" ? " about" : ""}` });
        region.innerHTML = body;
        const changed = () => { editors[name].dirty = true; markDirty(); };
        wireRegion(region, changed);
        editors[name] = { region, dirty: false };
        doc.append(h("section", { class: "ed-section" },
            h("h2", { class: "mono section-head" }, REGION_LABELS[name] || name), region,
            region.querySelector("img.headshot") && portraitControls(region.querySelector("img.headshot"), changed)));
    }

    function commit() {
        if (!view.dirty) return;
        const before = JSON.stringify(state.projects);
        if (feed) {
            const posts = feed.value();
            if (JSON.stringify(posts) !== JSON.stringify(state.updates)) { state.updates = posts; state.contentDirty = true; }
        }
        for (const t of thumbs) {
            const p = state.projects[t.key], v = opt(t.value(), p.thumb);
            if (v === undefined) delete p.thumb; else p.thumb = v;
        }
        if (JSON.stringify(state.projects) !== before) state.contentDirty = true;
        let html = state.workingHtml.replace(REGION_RE, (m, name, body, ind) => {
            const ed = editors[name];
            if (!ed?.dirty) return m;
            return `<!-- edit:${name} -->\n${serializeRegion(ed.region)}\n${ind}<!-- /edit:${name} -->`;
        });
        for (const input of metaInputs) {
            if (input.dirty) html = html.replace(input._re, (m, a, b, c) => a + escAttr(input.value.replace(/\s+/g, " ").trim()) + c);
        }
        if (social?.dirty) html = social.apply(html);
        if (html !== state.workingHtml) { state.workingHtml = html; state.htmlDirty = true; }
        view.dirty = false;
    }
    return view;
}

// The link-preview card: og:image holds an absolute URL (og:url plus the file's path), with its size and alt text
const ogRe = name => new RegExp(`(<meta property="og:${name}" content=")([^"]*)(">)`);
function socialCardFields(changed) {
    const get = name => state.workingHtml.match(ogRe(name))?.[2];
    const src = get("image");
    if (src === undefined) return null;
    const base = get("url") || "";
    const local = s => base && s.startsWith(base) ? s.slice(base.length) : s;
    // Values as written in the file (attribute-escaped)
    const tags = { "image": src, "image:width": get("image:width"), "image:height": get("image:height"), "image:alt": get("image:alt") };
    const preview = h("img", { class: "ed-thumb", src: local(src), alt: "" });
    const size = h("span", { class: "mono-data muted" });
    const showSize = () => { size.textContent = `${fromSrc(local(tags.image))} · ${tags["image:width"] ?? "?"} × ${tags["image:height"] ?? "?"}`; };
    showSize();
    const alt = h("input", { class: "ed-input", value: unescAttr(tags["image:alt"] || ""),
        oninput: () => { tags["image:alt"] = escAttr(alt.value.replace(/\s+/g, " ").trim()); changed(); } });
    const change = btn("Change image…", async () => {
        const f = await pickFile(IMAGE_EXT);
        if (!f) return;
        const path = toSrc(f), dims = await measure(path);
        if (!dims) { setStatus(`Couldn't load ${f}.`, true); return; }
        Object.assign(tags, { "image": base + path, "image:width": String(dims.width), "image:height": String(dims.height) });
        preview.src = path;
        showSize();
        changed();
        setStatus(dims.width < 1200 || dims.height < 630 || Math.abs(dims.width / dims.height - 1.91) > 0.05
            ? `${f} is ${dims.width} × ${dims.height}; link previews expect 1200 × 630 (1.91:1) and may crop or blur it.`
            : `Link-preview image set to ${f}.`);
    });
    return {
        dirty: false,
        el: [field("Image", h("div", { class: "ed-row" }, preview, size, change)), field("Alt text", alt)],
        // Rewrites only the tags already in the file; none are added
        apply: html => Object.entries(tags).reduce((acc, [name, v]) =>
            v === undefined ? acc : acc.replace(ogRe(name), (m, a, b, c) => a + v + c), html)
    };
}

// The About portrait: swap the photo (its width and height attributes follow it) and edit the alt text.
// The site shows it at 4:5, cropped to fill, 192 px wide, so 384 × 480 or larger stays sharp.
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg)$/i;
function portraitControls(img, changed) {
    const alt = h("input", { class: "ed-input", value: img.getAttribute("alt") || "",
        oninput: () => { img.setAttribute("alt", alt.value); changed(); } });
    const size = h("span", { class: "mono-data muted" });
    const showSize = () => { size.textContent = `${img.getAttribute("src")} · ${img.getAttribute("width")} × ${img.getAttribute("height")}`; };
    showSize();
    return h("div", {},
        field("Photo", h("div", { class: "ed-row" }, size, btn("Change photo…", async () => {
            const f = await pickFile(IMAGE_EXT);
            if (!f) return;
            const src = toSrc(f), dims = await measure(src);
            if (!dims) { setStatus(`Couldn't load ${f}.`, true); return; }
            img.setAttribute("src", src);
            img.setAttribute("width", dims.width);
            img.setAttribute("height", dims.height);
            showSize();
            changed();
            setStatus(dims.width < 384 || dims.height < 480
                ? `${f} is ${dims.width} × ${dims.height}; under 384 × 480 it will look soft. It's cropped to 4:5.`
                : `Portrait set to ${f}. It's cropped to 4:5 on the page.`);
        }))),
        field("Alt text", alt));
}

const LEAF = "p, dt, dd, li, .entry-title, .entry-meta, .entry-desc";

function wireRegion(region, changed) {
    const leaves = [...region.querySelectorAll(LEAF)].filter(el => !el.querySelector("p, ul, dl, div, .entry-title"));
    for (const el of leaves) makeLeaf(el, changed);

    // Row tools: résumé entries and skill chips
    const tools = h("div", { class: "ed-pop", hidden: true });
    region.append(tools);
    let target = null;
    const act = fn => () => { if (target) { fn(target); changed(); place(null); } };
    tools.append(
        h("button", { type: "button", class: "bare mono", title: "Move up", onclick: act(t => swap(t, t.previousElementSibling)) }, "↑"),
        h("button", { type: "button", class: "bare mono", title: "Move down", onclick: act(t => swap(t, t.nextElementSibling)) }, "↓"),
        h("button", { type: "button", class: "bare mono", title: "Duplicate", onclick: act(t => {
            const copy = t.cloneNode(true);
            for (const e of [copy, ...copy.querySelectorAll("[contenteditable]")]) {
                e.removeAttribute("contenteditable");
                e.removeAttribute("data-rich");
            }
            const ws = t.previousSibling?.nodeType === 3 ? t.previousSibling.textContent : "\n";
            t.after(document.createTextNode(ws), copy);
            const leavesIn = copy.matches(LEAF) ? [copy] : [...copy.querySelectorAll(LEAF)].filter(el => !el.querySelector("p, ul, dl, div, .entry-title"));
            leavesIn.forEach(el => makeLeaf(el, changed));
            caretTo(leavesIn[0] || copy, true);
        }) }, "Duplicate"),
        h("button", { type: "button", class: "bare mono", title: "Delete", onclick: act(t => {
            if (t.parentElement.children.length < 2) { setStatus("Keep at least one; edit it instead.", true); return; }
            if (t.previousSibling?.nodeType === 3) t.previousSibling.remove();
            t.remove();
        }) }, "Delete"));

    function place(row) {
        target = row;
        tools.hidden = !row;
        if (!row) return;
        const r = row.getBoundingClientRect(), base = region.getBoundingClientRect();
        tools.style.top = `${r.top - base.top - 6}px`;
        tools.style.left = `${Math.max(0, r.right - base.left - tools.offsetWidth)}px`;
    }
    region.addEventListener("mousemove", e => {
        if (tools.contains(e.target)) return;
        const row = e.target.closest(".rows > div, .tags > li");
        if (row !== target) place(row && region.contains(row) ? row : null);
    });
    region.addEventListener("mouseleave", () => place(null));
}

// Swaps two siblings in place, so the whitespace between them stays where it was
function swap(a, b) {
    if (!b || b.classList.contains("ed-pop")) return;
    const mark = document.createTextNode("");
    a.replaceWith(mark);
    b.replaceWith(a);
    mark.replaceWith(b);
}

function makeLeaf(el, regionChanged) {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("data-rich", "");
    const changed = () => { el.setAttribute("data-edited", ""); regionChanged(); };
    el.touch = changed;
    el.addEventListener("input", changed);
    el.addEventListener("paste", e => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
    });
    el.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (el.tagName === "LI" && !e.shiftKey) {
                const li = document.createElement("li");
                if (el.className) li.className = el.className;
                const ws = el.previousSibling?.nodeType === 3 ? el.previousSibling.textContent : "\n";
                el.after(document.createTextNode(ws), li);
                makeLeaf(li, regionChanged);
                caretTo(li, false);
                changed();
            }
        } else if (e.key === "Backspace" && el.tagName === "LI" && isEmpty(el) && el.parentElement.children.length > 1) {
            e.preventDefault();
            const prev = el.previousElementSibling || el.nextElementSibling;
            if (el.previousSibling?.nodeType === 3) el.previousSibling.remove();
            el.remove();
            caretTo(prev, true);
            changed();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            addLink();
        }
    });
}

// Region markup without the editor's attributes, inline markup cleaned where text was edited
function serializeRegion(region) {
    const copy = region.cloneNode(true);
    copy.querySelector(".ed-pop")?.remove();
    for (const el of copy.querySelectorAll("[contenteditable]")) {
        el.removeAttribute("contenteditable");
        el.removeAttribute("data-rich");
        if (el.hasAttribute("data-edited")) {
            el.removeAttribute("data-edited");
            const keepNbsp = el.innerHTML.match(/\d&nbsp;[a-z]/gi);   // "250&nbsp;g" is intentional
            el.innerHTML = cleanInline(el);
            if (keepNbsp) for (const k of keepNbsp) el.innerHTML = el.innerHTML.replace(k.replace("&nbsp;", " "), k);
        }
    }
    // The last text node is the indent before the closing marker, which the marker line supplies
    return copy.innerHTML.replace(/\s+$/, "");
}

// ---------- Project view ----------

function projectView(main, key) {
    const proj = state.projects[key];
    const view = { key, dirty: false, commit };
    const get = {};   // field name -> () => value, or undefined to drop the field

    const doc = h("article", { class: "ed-doc" });
    main.append(doc);

    // Header
    const title = editable("h1", proj.title, { cls: "title title-lg upright", placeholder: "Title" });
    const subtitle = editable("p", proj.subtitle, { cls: "title title-md muted", placeholder: "Subtitle (optional)" });
    const hidden = h("input", { type: "checkbox", checked: !!proj.hidden, onchange: markDirty });
    title.style.margin = "0 0 var(--s-3)";
    subtitle.style.margin = "0 0 var(--s-5)";
    doc.append(
        h("p", { class: "mono muted ed-hint" }, `#${key}`, " · ",
            h("label", {}, hidden, " Hidden (kept in content.js, left off the site)")),
        title, subtitle);
    get.title = () => title.value();
    get.subtitle = () => opt(subtitle.value(), proj.subtitle);
    get.hidden = () => hidden.checked ? true : undefined;

    // Index row
    const outcome = editable("p", proj.outcome, { rich: true, cls: "", placeholder: "One front-loaded result line" });
    outcome.style.margin = "0";
    const tags = tagInput(proj.tags || []);
    const thumb = pathField(proj.thumb || "", "Image path");
    doc.append(section("Index row", "The row on the home page: the headline result, its discipline tags, and a thumbnail.",
        field("Outcome", outcome), field("Tags", tags.el), field("Thumbnail", thumb.el)));
    get.outcome = () => opt(outcome.value(), proj.outcome);
    get.tags = () => tags.value().length ? tags.value() : (proj.tags ? [] : undefined);
    get.thumb = () => opt(thumb.value(), proj.thumb);

    // Summary
    const summary = {};
    const sumFields = [["problem", "Problem"], ["role", "Role"], ["tools", "Tools"], ["date", "Timeline"]];
    for (const [k] of sumFields) summary[k] = editable("dd", proj[k], { placeholder: "—" });
    doc.append(section("Summary", "The 15-second read at the top of the page. Empty rows are hidden.",
        h("dl", { class: "kv summary" }, sumFields.flatMap(([k, label]) => [h("dt", { class: "mono" }, label), summary[k]]))));
    for (const [k] of sumFields) get[k] = () => opt(summary[k].value(), proj[k]);

    // Results
    const results = resultsEditor(proj.results || []);
    doc.append(section("Key results", "Value, label and detail. The first three also show in the home panel.", results.el));
    get.results = () => results.value().length ? results.value() : (proj.results ? [] : undefined);

    // Hero media
    const hero = heroImageFields(proj.image || {});
    const video = pathField(proj.video || "", "Clip path (.mp4), optional", /\.mp4$/i);
    doc.append(section("Hero image", "The large figure under the results; a clip, if set, plays instead.",
        ...hero.el, field("Clip", video.el)));
    get.image = hero.value;
    get.video = () => opt(video.value(), proj.video);

    // Specs
    const specs = specsEditor(proj.specs);
    doc.append(section("Spec sheet", "Grouped label/value rows. Leave the title and groups empty to hide the sheet.", specs.el));
    get.specs = specs.value;

    // Body
    const body = h("div", { class: "prose ed-blocks" });
    body.style.maxWidth = "none";
    (proj.text || []).forEach(item => body.append(block(item, false)));
    const addMenu = btn("+ Add block", e => showMenu(e.currentTarget, insertItems(null, body, false)), "bare mono chip ed-btn ed-add");
    doc.append(section("Write-up", "Type like a doc: Enter starts a new paragraph, Backspace in an empty one removes it. Hover the left edge of a block for its menu. Select text to bold or link it.",
        body, addMenu));
    get.text = () => collectBlocks(body);

    function commit() {
        if (!view.dirty) return;
        const out = {};
        for (const k of [...Object.keys(proj), ...FIELD_ORDER]) {
            if (k in out) continue;
            const v = k in get ? get[k]() : proj[k];
            if (v !== undefined) out[k] = v;
        }
        state.projects[key] = out;
        state.contentDirty = true;
        view.dirty = false;
        // Keep the nav label in step with the title
        const navBtn = $("ed-nav").querySelector(`[data-key="${CSS.escape(key)}"]`);
        if (navBtn) navBtn.firstChild.textContent = out.title || key;
    }
    return view;
}

// Empty optional strings drop the field, unless the project already stored it as ""
const opt = (v, before) => v ? v : (before === "" ? "" : undefined);

function section(title, hint, ...kids) {
    return h("section", { class: "ed-section" },
        h("h2", { class: "mono section-head" }, title),
        hint && h("p", { class: "mono muted ed-hint" }, hint), ...kids);
}

const field = (label, control) => h("div", { class: "ed-field" }, h("span", { class: "mono ed-label" }, label), control);

function pathField(value, placeholder, filter = MEDIA_EXT, onChange) {
    const changed = () => { markDirty(); onChange?.(input.value.trim()); };
    const input = h("input", { class: "ed-input mono-data", value, placeholder, oninput: changed });
    const el = h("div", { class: "ed-row" }, input,
        btn("Choose…", async () => {
            const f = await pickFile(filter);
            if (f) { input.value = toSrc(f); changed(); }
        }));
    return { el, value: () => input.value.trim() };
}

// The `updates` feed: one card per post (date, title, text, optional image, optional part link), newest first.
// value() returns the edited array; fields a post had that the form doesn't show are kept.
function updatesEditor(initial) {
    const list = h("div");
    let rows = [];
    const keys = Object.keys(state.projects);

    function row(post) {
        const date = h("input", { type: "date", class: "ed-input mono-data", value: post.date || "", oninput: markDirty });
        const title = h("input", { class: "ed-input", value: post.title || "", oninput: markDirty, placeholder: "What changed" });
        const text = h("textarea", { class: "ed-input", rows: 3, oninput: markDirty, placeholder: "<strong>Lead-in.</strong> One or two sentences." });
        text.value = post.text || "";
        const src = pathField(post.image?.src || "", "Image path (empty: the linked part's image)", IMAGE_EXT);
        const alt = h("input", { class: "ed-input", value: post.image?.alt || "", oninput: markDirty, placeholder: "Describe the image" });
        const link = h("select", { class: "ed-input", onchange: markDirty }, h("option", { value: "" }, "No link"),
            keys.map(k => h("option", { value: k, selected: k === post.link }, state.projects[k].title || k)));
        const r = {
            value() {
                const out = { ...post, date: date.value, title: title.value.trim(), text: text.value.trim() };
                if (src.value()) out.image = { ...post.image, src: src.value(), alt: alt.value.trim() }; else delete out.image;
                if (link.value) out.link = link.value; else delete out.link;
                return out;
            }
        };
        r.el = h("div", { class: "ed-card" },
            h("div", { class: "ed-card-head" }, date,
                btn("Up", () => edit(posts => { const i = rows.indexOf(r); if (i > 0) posts.splice(i - 1, 0, posts.splice(i, 1)[0]); }), undefined, "Move up"),
                btn("Delete", () => edit(posts => posts.splice(rows.indexOf(r), 1)), undefined, "Delete update")),
            field("Title", title), field("Text", text), field("Image", src.el), field("Alt text", alt), field("Links to", link));
        return r;
    }

    function draw(posts) {
        rows = posts.map(row);
        list.replaceChildren(...rows.map(r => r.el));
    }
    function edit(change) {
        const posts = rows.map(r => r.value());
        change(posts);
        draw(posts);
        markDirty();
    }

    draw(initial);
    const add = btn("Add update", () => edit(posts => posts.unshift({ date: new Date().toLocaleDateString("en-CA"), title: "", text: "" })),
        "bare mono chip ed-btn");
    return { el: h("div", {}, add, list), value: () => rows.map(r => r.value()) };
}

// A project's `image`: path, alt text and caption. value() is undefined without a path.
function heroImageFields(img) {
    const src = pathField(img.src || "", "Image path");
    const alt = h("input", { class: "ed-input", value: img.alt || "", oninput: markDirty, placeholder: "Describe the image" });
    const cap = h("input", { class: "ed-input", value: img.caption || "", oninput: markDirty, placeholder: "What it shows and why it matters" });
    return {
        el: [field("Image", src.el), field("Alt text", alt), field("Caption", cap)],
        value: () => {
            if (!src.value()) return undefined;
            const out = { src: src.value() };
            if (alt.value || "alt" in img) out.alt = alt.value;
            if (cap.value || "caption" in img) out.caption = cap.value;
            return out;
        }
    };
}

function tagInput(tags) {
    const list = [...tags];
    const el = h("div", { class: "ed-tags" });
    const input = h("input", { class: "ed-input", placeholder: "Add tag, Enter", onkeydown: e => {
        if (e.key === "Enter" && input.value.trim()) {
            e.preventDefault();
            list.push(input.value.trim());
            input.value = "";
            draw();
            markDirty();
        }
    } });
    function draw() {
        el.replaceChildren(...list.map((t, i) => h("span", { class: "mono chip" }, t,
            h("button", { type: "button", class: "bare ed-x", "aria-label": `Remove ${t}`, onclick: () => { list.splice(i, 1); draw(); markDirty(); } }, "×"))), input);
    }
    draw();
    return { el, value: () => [...list] };
}

function resultsEditor(rows) {
    const ul = h("ul", { class: "cells results ed-results" });
    const cell = ([value, label, detail] = ["", "", ""]) => {
        const v = editable("span", value, { rich: true, cls: "title title-md upright", placeholder: "Value" });
        const l = editable("span", label, { rich: true, cls: "result-label", placeholder: "Label" });
        const d = editable("span", detail, { rich: true, cls: "mono-data muted", placeholder: "Detail" });
        const li = h("li", { class: "stat" }, v, l, d,
            h("span", { class: "ed-cell-tools" },
                btn("←", () => { li.previousElementSibling?.before(li); markDirty(); }, "bare mono chip ed-btn ed-btn-sm", "Move left"),
                btn("→", () => { li.nextElementSibling?.after(li); markDirty(); }, "bare mono chip ed-btn ed-btn-sm", "Move right"),
                btn("×", () => { li.remove(); markDirty(); }, "bare mono chip ed-btn ed-btn-sm", "Delete result")));
        li._value = () => [v.value(), l.value(), d.value()];
        return li;
    };
    rows.forEach(r => ul.append(cell(r)));
    const el = h("div", {}, ul, btn("+ Add result", () => { const li = cell(); ul.append(li); caretTo(li.firstChild, true); markDirty(); }));
    return { el, value: () => [...ul.children].map(li => li._value()) };
}

function specsEditor(specs) {
    const titleIn = h("input", { class: "ed-input", value: specs?.title || "", placeholder: "Sheet title, e.g. Generation X", oninput: markDirty });
    const groupsEl = h("div");
    const group = ({ group: name, rows } = { group: "", rows: [["", ""]] }) => {
        const head = editable("span", name, { cls: "mono", placeholder: "Group name" });
        const rowsEl = h("div");
        const row = ([k, v] = ["", ""]) => {
            const a = editable("span", k, { cls: "mono-data muted", placeholder: "Label" });
            const b = editable("span", v, { cls: "mono-data", placeholder: "Value" });
            const r = h("div", { class: "ed-spec-row" }, a, b,
                h("button", { type: "button", class: "bare ed-x", "aria-label": "Delete row", onclick: () => { r.remove(); markDirty(); } }, "×"));
            r._value = () => [a.value(), b.value()];
            return r;
        };
        rows.forEach(r => rowsEl.append(row(r)));
        const g = h("div", { class: "ed-spec-group" },
            h("div", { class: "ed-spec-head" }, head,
                btn("↑", () => { g.previousElementSibling?.before(g); markDirty(); }, undefined, "Move group up"),
                btn("↓", () => { g.nextElementSibling?.after(g); markDirty(); }, undefined, "Move group down"),
                btn("Delete group", () => { g.remove(); markDirty(); })),
            rowsEl,
            btn("+ Row", () => { const r = row(); rowsEl.append(r); caretTo(r.firstChild, true); markDirty(); }));
        g.style.marginTop = "0";
        g._value = () => ({ group: head.value(), rows: [...rowsEl.children].map(r => r._value()) });
        return g;
    };
    (specs?.groups || []).forEach(gr => groupsEl.append(group(gr)));
    const el = h("div", {}, field("Title", titleIn), groupsEl,
        btn("+ Add group", () => { groupsEl.append(group()); markDirty(); }));
    return {
        el,
        value: () => {
            const groups = [...groupsEl.children].map(g => g._value());
            if (!titleIn.value.trim() && !groups.length) return undefined;
            return { title: titleIn.value.trim(), groups };
        }
    };
}

// ---------- Blocks: the `text` array ----------

// One block per text item; each wrapper carries ._value() and ._type
function block(item, inFold) {
    const wrap = h("div", { class: "ed-block" });
    let content;
    if (typeof item === "string") {
        content = textBlock("p", item, wrap, inFold);
        wrap._type = "p";
        wrap._value = () => content.value();
    } else if ("heading" in item) {
        content = textBlock("h2", item.heading, wrap, inFold);
        wrap._type = "heading";
        wrap._value = () => ({ heading: content.value() });
    } else if ("list" in item) {
        content = listBlock(item.list, wrap, inFold);
        wrap._type = "list";
        wrap._value = () => ({ list: content._items() });
    } else if ("figure" in item) {
        const sel = h("select", { class: "ed-select", onchange: markDirty },
            [...new Set([...FIGURES, item.figure])].map(f => h("option", { value: f, selected: f === item.figure }, f)));
        content = h("div", { class: "ed-card" }, h("div", { class: "ed-card-head" },
            h("span", { class: "mono" }, "Interactive figure"), sel,
            h("span", { class: "mono muted" }, "Drawn by script.js; numbered automatically.")));
        wrap._type = "figure";
        wrap._value = () => ({ figure: sel.value });
    } else if ("media" in item) {
        content = mediaBlock(item);
        wrap._type = "media";
        wrap._value = content._value;
    } else if ("fold" in item) {
        content = foldBlock(item);
        wrap._type = "fold";
        wrap._value = content._value;
    } else {
        // Unknown item: kept exactly as stored
        content = h("pre", { class: "ed-card mono-data" }, JSON.stringify(item, null, 2));
        wrap._type = "raw";
        wrap._value = () => item;
    }
    const menuBtn = h("button", { type: "button", class: "bare", title: "Block menu", "aria-label": "Block menu" }, "⋮⋮");
    const addBtn = h("button", { type: "button", class: "bare", title: "Insert below", "aria-label": "Insert block below" }, "+");
    menuBtn.onclick = () => showMenu(menuBtn, blockMenu(wrap, inFold));
    addBtn.onclick = () => showMenu(addBtn, insertItems(wrap, wrap.parentElement, inFold));
    wrap.append(h("div", { class: "ed-gutter" }, addBtn, menuBtn), content);
    return wrap;
}

function blockMenu(wrap, inFold) {
    const t = wrap._type;
    const turn = (label, type) => t !== type && ["p", "heading", "list"].includes(t) && !(inFold && type === "heading")
        ? [[label, () => convert(wrap, type, inFold)]] : [];
    return [
        ...turn("Turn into paragraph", "p"),
        ...turn("Turn into heading", "heading"),
        ...turn("Turn into bullet list", "list"),
        ...(["p", "heading", "list"].includes(t) ? ["-"] : []),
        ["Move up", () => { wrap.previousElementSibling?.before(wrap); markDirty(); }],
        ["Move down", () => { wrap.nextElementSibling?.after(wrap); markDirty(); }],
        ["Duplicate", () => { wrap.after(block(structuredClone(wrap._value()), inFold)); markDirty(); }],
        "-",
        ["Delete", () => { wrap.remove(); markDirty(); }]
    ];
}

function insertItems(after, container, inFold) {
    const add = item => () => {
        const b = block(item, inFold);
        if (after) after.after(b); else container.append(b);
        markDirty();
        const ed = b.querySelector("[contenteditable]");
        if (ed) caretTo(ed, true);
        if (item.media && !item.media.length) b.querySelector(".ed-add-media")?.click();
    };
    return [
        ["Paragraph", add("")],
        ...(inFold ? [] : [["Heading", add({ heading: "" })]]),
        ["Bullet list", add({ list: [""] })],
        ["Photos or clips", add({ media: [], caption: "" })],
        ["Interactive figure", add({ figure: FIGURES[0] })],
        ...(inFold ? [] : [["Fold (collapsible detail)", add({ fold: "", text: [""] })]])
    ];
}

function textOf(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent;
}
function htmlOf(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
}

// Paragraph, heading and list convert into each other; a list becomes one paragraph per item
function convert(wrap, type, inFold) {
    const v = wrap._value();
    const items = typeof v === "string" ? [v] : v.list ? v.list : [htmlOf(v.heading)];
    const blocks = type === "p" ? items.map(x => block(x, inFold))
        : type === "list" ? [block({ list: items.length ? items : [""] }, inFold)]
        : [block({ heading: items.map(textOf).join(" ") }, inFold)];
    wrap.replaceWith(...blocks);
    const eds = blocks[blocks.length - 1].querySelectorAll("[contenteditable]");
    if (eds.length) caretTo(eds[eds.length - 1], true);
    markDirty();
}

function textBlock(tag, value, wrap, inFold) {
    const isHeading = tag === "h2";
    const el = editable(tag, value, {
        rich: !isHeading,
        cls: isHeading ? "subhead" : "",
        placeholder: isHeading ? "Heading: state the finding" : "Type here",
        onEnter: () => splitBlock(el, wrap, inFold),
        onBackspaceEmpty: () => removeAndFocusPrev(wrap)
    });
    el.addEventListener("keydown", e => {
        if (e.key === "Backspace" && !isEmpty(el) && caretAtStart(el) && !isHeading) {
            const prev = wrap.previousElementSibling;
            const prevEd = prev?._type === "p" && prev.querySelector("[contenteditable]");
            if (prevEd) {
                e.preventDefault();
                caretTo(prevEd, true);
                const r = getSelection().getRangeAt(0);
                const frag = document.createDocumentFragment();
                while (el.firstChild) frag.append(el.firstChild);
                const marker = document.createTextNode("");
                r.insertNode(marker);
                marker.after(frag);
                prevEd.touch();
                wrap.remove();
                markDirty();
                const sel = getSelection();
                sel.collapse(marker, 0);
            }
        }
        arrowNav(e, el);
    });
    return el;
}

// Enter: the text after the caret moves to a new paragraph below
function splitBlock(el, wrap, inFold) {
    const sel = getSelection();
    let rest = "";
    if (sel.rangeCount && el.getAttribute("contenteditable") === "true") {
        const r = sel.getRangeAt(0);
        r.deleteContents();
        const tail = document.createRange();
        tail.setStart(r.endContainer, r.endOffset);
        tail.setEnd(el, el.childNodes.length);
        const box = document.createElement("div");
        box.append(tail.extractContents());
        rest = cleanInline(box);
        el.touch();
    }
    const b = block(rest, inFold);
    wrap.after(b);
    const ed = b.querySelector("[contenteditable]");
    ed.touch();
    caretTo(ed, false);
    markDirty();
}

function removeAndFocusPrev(wrap) {
    const prev = wrap.previousElementSibling, next = wrap.nextElementSibling;
    wrap.remove();
    markDirty();
    const eds = prev?.querySelectorAll("[contenteditable]");
    if (eds?.length) caretTo(eds[eds.length - 1], true);
    else if (next?.querySelector("[contenteditable]")) caretTo(next.querySelector("[contenteditable]"), false);
}

// Up and Down cross into the neighboring text block from the first or last line
function arrowNav(e, el) {
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || e.shiftKey) return;
    const sel = getSelection();
    if (!sel.rangeCount) return;
    const rects = sel.getRangeAt(0).getClientRects();
    const caret = rects[0] || el.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const up = e.key === "ArrowUp";
    if (up ? caret.top - box.top > line * 0.8 : box.bottom - caret.bottom > line * 0.8) return;
    const all = [...document.querySelectorAll(".ed-blocks [contenteditable]")];
    const i = all.indexOf(el);
    const to = all[up ? i - 1 : i + 1];
    if (to) { e.preventDefault(); caretTo(to, !up); }
}

function listBlock(items, wrap, inFold) {
    const ul = h("ul", { class: "marks prose-list" });
    const li = html => {
        const el = editable("li", html, {
            rich: true, placeholder: "List item",
            onEnter: () => {
                if (isEmpty(el) && !el.nextElementSibling) {
                    // Enter on an empty last item leaves the list for a new paragraph
                    el.remove();
                    const b = block("", inFold);
                    wrap.after(b);
                    if (!ul.children.length) wrap.remove();
                    caretTo(b.querySelector("[contenteditable]"), false);
                    markDirty();
                    return;
                }
                const n = li("");
                el.after(n);
                caretTo(n, false);
                markDirty();
            },
            onBackspaceEmpty: () => {
                const prev = el.previousElementSibling;
                el.remove();
                markDirty();
                if (prev) caretTo(prev, true);
                else if (!ul.children.length) removeAndFocusPrev(wrap);
                else caretTo(ul.firstElementChild, false);
            }
        });
        el.addEventListener("keydown", e => arrowNav(e, el));
        return el;
    };
    items.forEach(it => ul.append(li(it)));
    ul._items = () => [...ul.children].map(el => el.value()).filter(Boolean);
    return ul;
}

function mediaBlock(item) {
    const list = h("div", { class: "ed-media" });
    const mediaItem = it => {
        const data = { ...it };
        const isClip = () => /\.mp4$/i.test(data.src);
        const thumb = () => isClip()
            ? h("video", { class: "ed-thumb", src: data.src, poster: data.src.replace(/\.mp4$/i, ".jpg"), muted: true, preload: "none" })
            : h("img", { class: "ed-thumb", src: data.src, alt: "", loading: "lazy" });
        let t = thumb();
        const alt = h("textarea", { class: "ed-input", rows: 3, placeholder: "Alt text: what the image shows",
            oninput: () => { data.alt = alt.value; markDirty(); } });
        alt.value = unescAttr(data.alt || "");
        const size = h("span", { class: "mono-data muted" }, `${data.width} × ${data.height}`);
        const el = h("div", { class: "ed-media-item" }, t,
            h("span", { class: "mono-data muted", title: fromSrc(data.src) }, fromSrc(data.src).split("/").pop()), size, alt,
            h("div", { class: "ed-row" },
                btn("←", () => { el.previousElementSibling?.before(el); markDirty(); }, undefined, "Move left"),
                btn("Replace", async () => {
                    const f = await pickFile();
                    if (!f) return;
                    await setSrc(toSrc(f));
                }),
                btn("→", () => { el.nextElementSibling?.after(el); markDirty(); }, undefined, "Move right"),
                btn("×", () => { el.remove(); markDirty(); }, undefined, "Remove")));
        async function setSrc(src) {
            const dims = await measure(src);
            if (!dims) { setStatus(`Couldn't load ${fromSrc(src)} to read its size.`, true); return; }
            Object.assign(data, { src, width: dims.width, height: dims.height });
            const n = thumb();
            t.replaceWith(n);
            t = n;
            el.children[1].textContent = fromSrc(src).split("/").pop();
            size.textContent = `${dims.width} × ${dims.height}`;
            markDirty();
        }
        el._setSrc = setSrc;
        // Key order as stored: src, width, height, alt
        // alt goes into an attribute through a template in script.js, so quotes are stored escaped
        el._value = () => ({ src: data.src, width: data.width, height: data.height, alt: alt.value.trim().replace(/"/g, "&quot;") });
        return el;
    };
    (item.media || []).forEach(it => list.append(mediaItem(it)));
    const caption = editable("span", item.caption, { rich: true, cls: "mono muted ed-caption", placeholder: "Caption: what it shows and why it matters (no “Fig. N”)" });
    const card = h("div", { class: "ed-card" },
        h("div", { class: "ed-card-head" }, h("span", { class: "mono" }, "Photos and clips"),
            h("span", { class: "mono muted" }, "Sized by aspect ratio; .mp4 clips need a .jpg poster beside them.")),
        list,
        btn("+ Add photo or clip", async () => {
            const f = await pickFile();
            if (!f) return;
            const el = mediaItem({ src: toSrc(f), width: 0, height: 0, alt: "" });
            list.append(el);
            await el._setSrc(toSrc(f));
            el.querySelector("textarea").focus();
        }, "bare mono chip ed-btn ed-btn-sm ed-add-media"),
        caption);
    card._value = () => {
        const out = { media: [...list.children].map(el => el._value()) };
        const cap = caption.value();
        if (cap || "caption" in item) out.caption = cap;
        return out;
    };
    return card;
}

function foldBlock(item) {
    const label = h("input", { class: "ed-input", value: item.fold, placeholder: "Fold label, e.g. How the airfoils were ranked", oninput: markDirty });
    label.style.fontSize = "var(--t-18)";
    const inner = h("div", { class: "ed-blocks fold-body" });
    inner.style.padding = "0";
    (item.text || []).forEach(it => inner.append(block(it, true)));
    const card = h("div", { class: "ed-fold" },
        h("div", { class: "ed-row" }, h("span", { class: "mono muted" }, "Fold"), label),
        inner,
        btn("+ Add inside fold", e => showMenu(e.currentTarget, insertItems(null, inner, true))));
    card._value = () => ({ fold: label.value.trim(), text: collectBlocks(inner) });
    return card;
}

function collectBlocks(container) {
    return [...container.children]
        .filter(w => w._value)
        .map(w => w._value())
        .filter(v => !(v === "" || (v.list && !v.list.length) || (v.heading === "") || (v.media && !v.media.length && !v.caption)));
}

// ---------- Checks after saving ----------

function lint() {
    const notes = [];
    const files = new Set((state.files || []).map(f => f.toLowerCase()));
    const walk = (items, key, inFold) => (items || []).forEach(it => {
        if (typeof it === "string") return;
        if (it.heading != null && inFold) notes.push(`${key}: heading “${it.heading}” is inside a fold, so Contents can't reach it`);
        if (it.caption && /^\s*fig(ure)?\.?\s*\d/i.test(it.caption)) notes.push(`${key}: a caption starts with a figure number; they're added automatically`);
        for (const m of it.media || []) {
            if (!m.alt) notes.push(`${key}: ${fromSrc(m.src)} has no alt text`);
            if (!m.width || !m.height) notes.push(`${key}: ${fromSrc(m.src)} has no width or height`);
            if (/\.mp4$/i.test(m.src) && state.dir && state.files && !files.has(fromSrc(m.src).replace(/\.mp4$/i, ".jpg").toLowerCase()))
                notes.push(`${key}: ${fromSrc(m.src)} has no .jpg poster beside it`);
        }
        if (it.fold) walk(it.text, key, true);
    });
    for (const [key, p] of Object.entries(state.projects)) {
        if (!p.title) notes.push(`${key}: no title`);
        walk(p.text, key, false);
    }
    const box = $("ed-lint");
    box.hidden = !notes.length;
    box.replaceChildren(h("span", { class: "muted" }, `Saved. ${notes.length} thing${notes.length === 1 ? "" : "s"} to check:`),
        h("ul", {}, notes.map(n => h("li", {}, n))),
        btn("Dismiss", () => { box.hidden = true; }));
}

// ---------- Start ----------

let remembered = null;   // folder handle from the last visit, opened on the next click
$("ed-open").addEventListener("click", () => {
    if (anyDirty() && !confirm("Discard unsaved changes and open another folder?")) return;
    const handle = remembered;
    remembered = null;
    openFolder(handle);
});
$("ed-save").addEventListener("click", save);
addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
});
addEventListener("hashchange", () => {
    const key = location.hash.slice(1) || "home";
    if (state.projects && key !== state.view?.key) go(key);
});

(async () => {
    if (!canWriteFolder) {
        // Brave (by default) and Firefox/Safari: load through the server, save as downloads
        const brave = await navigator.brave?.isBrave?.().catch(() => false);
        $("ed-folder").textContent = "Download mode";
        setStatus(brave
            ? "Brave has direct saving off. To save straight into the folder, enable brave://flags/#file-system-access-api and relaunch. Until then, Save downloads the changed files."
            : "This browser can't write to folders, so Save downloads the changed files to move into the site folder.");
        $("ed-open").textContent = "Load site files";
        await openFolder(null);
        return;
    }
    const saved = await idb("readonly", s => s.get("dir")).catch(() => null);
    if (saved) {
        // Permission needs a click, so offer the remembered folder instead of opening it
        remembered = saved;
        $("ed-open").textContent = `Reopen “${saved.name}”`;
    }
})();
