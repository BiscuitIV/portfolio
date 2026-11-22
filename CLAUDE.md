\# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal engineering portfolio for Pavlos P: a static, single-page site in four files (`index.html`, `style.css`, `content.js`, `script.js`), plus a local-only content editor (`editor.html`, `editor.js`) that is never deployed. It has no build step, package manager, dependencies, linter or tests. The only external resource is Google Fonts (Inter Tight).

To preview it, serve the folder statically. The workspace is set up for the VS Code Live Server extension on port 5501 (`.vscode/settings.json`); `python -m http.server` also works. Check changes in a browser at both desktop width and below the 860px breakpoint.

| File | Holds |
|---|---|
| `index.html` | Both views' static markup: the hero, the résumé sections (education, experience, skills, activities, about), the panel skeleton and the project-view skeleton. Résumé text lives only here. |
| `style.css` | Tokens in `:root`, the primitives, then one section per area of the page (see "Code map"). |
| `content.js` | The `updates` feed and the `projects` content model, loaded before `script.js`. After `const updates = ` and `const projects = ` each is strict JSON. |
| `script.js` | Aerodynamics data, `contact`, `formatDate`, the figure builders, and all DOM wiring (index, panel, routing). |
| `editor.html`, `editor.js` | Local content editor (see "Content editor"). Listed in `.vercelignore`. |
| `lws-x/lws-x-full-story.md` | Long-form prose version of the LWS X write-up; not loaded by the site. |

## Content editor

`editor.html` edits the home page and every project like a doc and saves straight into `content.js` and `index.html`. Serve the folder (Live Server), open `/editor.html`, and pick the repo root. Chrome and Edge save in place through the File System Access API; Brave does once `brave://flags/#file-system-access-api` is enabled. Without the API (Brave by default, Firefox, Safari) the editor runs in download mode: it loads the files through the server and Save downloads the changed ones to copy into the folder. `.vercelignore` keeps both editor files off Vercel; nothing else hides them, so another host would serve them (harmlessly, since they need a local folder to do anything).

What it relies on, so keep these intact:
- **`content.js` is strict JSON** after `const projects = ` at the start of a line, up to the final `;`: no comments, trailing commas, template literals or expressions. The editor parses it with `JSON.parse` and rewrites it with `JSON.stringify(projects, null, 4)`, so hand edits must follow the same format (a no-op save is then byte-identical). Computed values belong in `script.js`, not here. The comment lines above the prefix are kept.
- **Edit markers in `index.html`**: résumé regions sit between `<!-- edit:<name> -->` and `<!-- /edit:<name> -->` on their own lines (`lede`, `bio`, `education`, `experience`, `skills`, `activities`, `headshot` (the About portrait `<img>`, whose `src`, `width`, `height` and `alt` the editor sets), `about`). The editor rewrites only the text between markers it changed, plus `<meta name="description">`, `og:description` and the `og:image` tags (`og:image`, `:width`, `:height`, `:alt`; the image URL is `og:url` plus the file's path); the rest of the file stays byte-identical. An edited region is reserialized from the DOM, so its named entities (`&ndash;`, `&middot;`, `&rsquo;`) become literal UTF-8 characters.
- **`FIGURES` in `editor.js`** lists the `figures` registry names; update it when a builder is added.
- **`const updates = `** at the start of a line in `content.js`, above `const projects = `: strict JSON up to the last `;` before the projects prefix, rewritten with `JSON.stringify(updates, null, 4)` (same rules as `projects`). The editor's Home view edits it under "Recent updates". Without that line the editor leaves the file's head alone and shows no feed section.

The editor checks the files on disk before saving and asks before overwriting changes made elsewhere. It doesn't touch `lws-x/lws-x-full-story.md`, so LWS X figure changes still need a manual update there.

## Architecture

**Two views, hash routing.** `index.html` holds both `#home-view` (the résumé index plus a fixed preview panel) and `#project-view` (one article column). `route()` in `script.js` runs on `hashchange`. If `#<key>` matches a key in `projects`, the project view is shown and rebuilt from data; any other hash shows the home view. Because the hash selects the project, in-article navigation (the Contents list) uses buttons that scroll to the heading, not `#anchor` links.

`route()` also keeps the reader's place and the page metadata: it saves the index scroll position when a project opens and restores it on the way back, sets `document.title` and `<meta name="description">` (the project's `outcome`, markup stripped), and fills the Prev / Next links in the sticky `.project-bar` (`#project-prev`, `#project-next`, wrapping at both ends). The project title is the `<h1>` of its view; generated subheads and the spec-sheet head are `<h2>`.

**Lightbox.** Photos in `{ media }` figures are links with class `.fig-zoom`. One delegated click handler on `#project-description-container` opens them in the `<dialog id="lightbox">` at the end of `index.html`, copying the figure's caption; modified clicks (Ctrl, Shift, middle button) keep the link's new-tab behavior. The dialog has no padding of its own, so a click whose target is the dialog is a backdrop click and closes it. Don't write "click to enlarge" into captions.

**`projects` is the content model.** Each entry in the `projects` object in `content.js` becomes one index row and one project page. Insertion order sets the "drawing number" (`drawingNumber(key)`, zero-padded), so reordering keys renumbers projects, and it also sets the "Next" link that ends each project page (the next key, wrapping). Optional fields:
- Index row: `subtitle`, `outcome` (one front-loaded result line), `thumb` (image path, decorative; rows without one show an empty `.tint` box), and `tags` (disciplines, listed after the year on the row's meta line).
- Summary block (the 15-second read at the top of a project page): `problem`, `role`, `tools`, plus `date` as Timeline.
- Body: `results` (`[value, label, detail]`), `image`, `video`, and `specs` (`{ title, groups: [{ group, rows }] }`).

Summary rows and sections are hidden when their field is missing. The `text` array is a small document format:
- a string is a paragraph, inserted with `innerHTML` so it may contain `<strong>` lead-ins and `<a class="link">`
- `{ heading }` is a numbered subhead; three or more headings generate the Contents nav
- `{ list: [html] }` is a bullet list
- `{ figure: name }` calls a builder in the `figures` registry (`airfoils`, `polars`, `timeline`, `sweep`, `reynolds`)
- `{ media: [{ src, width, height, alt }], caption }` is a row of photos or clips, sized by aspect ratio. `width` and `height` are required. A `.mp4` item takes its poster from the same path with `.jpg`. Muted clips autoplay while on screen unless reduced motion is set.
- `{ fold: label, text: [...] }` is a collapsible `<details>` for technical depth, rendered recursively by `renderItem()`. Don't put headings inside a fold, so Contents targets are never hidden.

Figure numbers ("Fig. N —") are added automatically at render time and continue across folds. Don't write them into captions.

**Writing for scanning.** Headings state the finding ("Nine generations, from 263g to 216g"), not the topic. Paragraphs are 1–3 sentences with the conclusion first. Captions say what the image shows and why it matters. Method detail goes in a `{ fold }`.

**Home hero and section nav.** The intro (`header.intro`) holds the name, a one-line value prop (`.lede`, also in `<meta name="description">`) and the bio list. Directly after it, as a child of `.sheet-left` rather than the header (so `position: sticky` spans the whole column), is the `#jump` section nav: one button per section (`data-jump="<heading id>"`, Projects as the solid `.chip-solid` primary, the rest outlined chips) that scrolls to and focuses that heading through `jumpTo()` (not `#anchor` links, since the hash selects the project; the Contents nav uses the same helper). `.intro` has a `min-height` worked out from the column padding and `--jump-h`, so on load the hero (with the panel, or `#hero-frame` below 860px) fills the first screen, the nav sits on its bottom edge, and the résumé starts below the fold. The nav sticks to the top of the left column while the résumé scrolls. `updateJumpNav()` (run on scroll through `requestAnimationFrame`, and on resize and hash changes) adds `.is-stuck` for the hairline under it and sets `aria-current="true"` on the button for the section being read: the last section whose top has passed the nav, or the last section at the page end. A `ResizeObserver` writes the nav's height to `--jump-h` on `#home-view`, and `.sheet-left .section-head` uses it as `scroll-margin-top` so jumped-to headings land below the nav. The nav is always one row, centered in the column (auto margins on the first and last buttons); when the column is too narrow for every button (always below 860px, sometimes on narrow desktops) the row scrolls sideways and is scrolled to keep the current button visible. The hero has no contact links; they appear in the About section, the panel title block and the project footer. The `.about` section at the end of the left column holds the portrait beside a short first-person intro and the contact links. The portrait is `web/headshot.jpg`, a 384×480 (4:5, 2× display) crop of the original `Headshot.jpeg` at the repo root; re-export it from the original rather than pointing the page at the full-size file. `.headshot` uses `object-fit: cover`, so a replacement photo of another shape is cropped to 4:5 rather than stretched. `outcome` strings may wrap their headline result in `<strong>`.

**Recent updates.** `updates` in `content.js` is a short dated feed of recent work, newest first: `{ date: "YYYY-MM-DD", title, text, image?: { src, alt }, link?: "<project key>" }`. `text` is one or two sentences of HTML with a `<strong>` lead-in (shown as the cell's tooltip and in the excerpt card). `link` makes the post a link to that part when it is published; a post without `image` borrows the linked part's `partImage`. Dates show as "Nov 15, 2026" through `formatDate`. Posts are written for readers (what changed and why it matters), not copied from commit messages.

**Home panel.** When idle, `fillFeed()` shows the newest update's image (caption "Latest update", or the excerpt card when it has none) and its date and title as one linked `.feed-post` headline in `#panel-results` (`aria-label` "Latest update"; `fillPanel` sets it back to "Key results"). Hovering or focusing an index row calls `showPreview(key)` to preview that part instead, and leaving calls `hidePreview()`, which returns to the feed. `fillPanel(key, label)` owns a part's contents: the part's `image` (or `thumb`) in the frame link with a caption, or the excerpt card for a part with neither, plus its first three `results` as stat cells. A part's `video` covers the frame once it plays. Experience rows have no panel behavior. `previewToken` cancels stale async video loads, so bump it in any new code that changes the panel. The title block (`setTitleBlock`) and the dimension-line labels are updated from the same calls. Below 860px the panel is hidden.

Panel sequence in detail:
- `activatePanel(info)` bumps `previewToken`, clears the pending video timer, writes the frame's measured width and height into the dimension labels (`#dim-w`, `#dim-h`), adds `.is-active` to `#frame-wrap` (which draws the dimension lines) and fills the title block.
- `showPreview(key)` calls `activatePanel`, then `fillPanel`. If the part has a `video`, it waits 200ms, sets the source on `#featured-video` and shows it (`.visible`) only if the token still matches. If playback fails, it falls back to the excerpt card with "Render unavailable in this browser."
- `hidePreview()` bumps the token, removes `.is-active`, resets the title block to "Portfolio index" / "00" / "2026", refills the feed (`fillFeed()`), and unloads the video after 300ms.
- `fillFrame(image, href, caption)` sets the frame image and caption chip, or shows the excerpt card when `image` is empty. `fillCard(meta, title, text)` fills the excerpt card; `fillProjectCard(key, excerptText)` is its part version (`#card-meta`, `#card-title`, `#card-body`). For a part with no image, the excerpt is the first `text` paragraph with its markup stripped.

**Single sources.** The `contact` array fills every `.contact-links` element in both views. Résumé entries (education, roles, skills, activities) live only in `index.html`.

**Aerodynamics data.** The `airfoils` (profile coordinates and XFoil polars), `sweep` (1,052-foil batch ranking), `air(h)` (ISA plus Sutherland) and `reynolds()` blocks at the top of `script.js` feed the charts and the Reynolds calculator. The LWS X spec row "Re @ 8 m/s" in `content.js` is a literal ("≈ 60,200", `formatRe(reynolds(8, 0))`), since `content.js` is JSON; recompute it if the chord or the air model changes. Comments there record the data provenance and solver settings, so keep them accurate. The polar charts and the sweep scatter each render inline SVG at the measured container width using a `ResizeObserver`, with a pointer-hover tooltip.

**Facts live in several places.** LWS X numbers (masses, speeds, Cl/Cd, airfoil counts) appear in the `outcome`, `problem`, `results`, `specs` and `text` entries in `content.js`, and in `lws-x/lws-x-full-story.md`, a long-form prose version of the same write-up. When a figure changes, update every copy.

## Code map

**`script.js`, top to bottom:**
- `content.js` (loaded first): `updates` (the idle feed, newest first), then `projects`, keys in drawing order: `plane` for LWS X, `printer`, `drones`, which includes the custom FPV frame, and `radio-dock`, which is hidden. An entry with `hidden: true` stays in the data but is left out of `projectKeys`, so it has no index row, drawing number or route.
- Data in `script.js`: `airfoils`, `sweep`, `air(h)`, `reynolds(v, h)`, `formatRe(re)`, `contact` and `formatDate(iso)` (for `updates` dates).
- Helpers: `projectKeys`, `drawingNumber(key)`, `makeFigure(plateClass, plateHTML, caption)` (wraps a builder's output in `.fig-plate.tint` plus a caption), `reduceMotion` (a `matchMedia` query), `jumpTo(el)`, `clipPlayer` (an `IntersectionObserver` that plays muted clips while at least half on screen), `mediaFigure(items, caption)`, `stepRows(steps)`, `niceTicks(min, max, count)`, `polarCharts` with `polarPanel(chart)` and `polarSummary()`.
- `figures`: one builder per `{ figure: name }`. `airfoils()` draws a true-scale section overlay (SVG units are mm), `polars()` the Cl/Cd charts and summary table, `timeline()` the generation steps, `sweep()` the 1,050-foil scatter, `reynolds()` the calculator with altitude and speed sliders.
- `kvPair([label, value], dtClass, ddClass)` and `renderSpecs(container, { title, groups })`.
- One `DOMContentLoaded` handler, in this order: contact links, `setTitleBlock`, the panel functions, the section nav (`jumps`, `updateJumpNav()`), index generation, then `route()` (summary, results, hero media, specs, `renderItem()` for the text array, the Next link, the Contents nav), bound to `hashchange` and run once on load.

**`index.html` ids that the script fills or watches:** `#jump` (section nav), `#project-links-container` (index `<ol>`), `#frame-wrap`, `#frame`, `#frame-card` (`#card-meta`, `#card-title`, `#card-body`), `#featured-video`, `#panel-results`, `#dim-w`, `#dim-h`, `#tb-title`, `#tb-no`, `#tb-date`; in the project view `#project-no`, `#project-title`, `#project-subtitle`, `#project-summary`, `#project-results`, `#project-figure` (`#project-video`, `#project-image`, `#project-caption`), `#project-specs` (`#specs-head`), `#project-description-container`. Section heading ids (`projects-head`, `education-head`, `experience-head`, `skills-head`, `activities-head`, `about-head`) are the `data-jump` targets.

**`style.css` sections, in order:** tokens (`:root`) and base (`html`, `body`, `a`, `:focus-visible`); Primitives; Home: left column; Home: preview panel (frame, feed cells, dimension lines, title block); Project view (bar, head, summary, prose, Contents, footer); Project spec sheet; Project figures (plates, polars, sweep, timeline pipeline, Reynolds calculator); the 860px media query; the reduced-motion query, which zeroes every transition.

## Styling conventions

- The theme is "Studio": light gray paper, near-black ink, gray hairlines and one cobalt accent (`--accent`), all in Inter Tight. The layout and the site's terms still come from a drafting sheet: "Dwg no.", title block, dimension lines, "parts" for projects. Alternatives that were tried are recorded under "Style options" below.
- Use the tokens in `:root` (colors, `--font`/`--font-label`, the `--t-*` type scale, the `--s-*` spacing scale, `--line`/`--line-strong`/`--line-soft`, `--radius`/`--radius-sm`/`--radius-chip`, `--dur`/`--ease`) rather than raw values. `--line` is the `--edge` hairline on boxes, chips and thumbnails; `--line-strong` is the ink rule under section and index heads; `--line-soft` separates list rows. `--radius` rounds boxes (frames, figure plates, `.cells` groups) and `--radius-sm` rounds small parts (thumbnails, tooltips, the row tint, focus rings). Chips (buttons, skill tags) use `--radius-chip` (3px), between the two, so they read as buttons. Rules and lines stay square.
- The "Primitives" section of `style.css` is what components are built from; compose them before adding new classes:
  - Voices: `.mono` (uppercase labels, medium weight), `.mono-data` (keeps case for units); both use `--font-label` with tabular figures, and the name is historical (no monospace font is loaded). Also `.muted`, `.title` + size modifiers (upright, medium; the display name is semibold), `.upright` (semibold for scanned titles), `.subhead`.
  - Interaction: `.link` (accent underline), `.cue` (accent label color). Both trigger on themselves or on a hovered or focused `a`/`button` ancestor.
  - Structure: `.kv` (label/value grid), `.cells` (1px `--edge` rules between children), `.stat` (label over value cell), `.marks` (accent-marker bullets), `.chip` (ruled label; `button.chip` is semibold; with `aria-pressed` it is a toggle), `.bare` (button reset; it comes first so the other primitives override it), `.fold` (`<details>`), `.tint` (plain `--paper-2` fill for the panel, figure plates and empty thumbnails), `.section-head`.
  - In JS, `kvPair([label, value], dtClass, ddClass)` builds every generated `<dt>`/`<dd>`.
- `a.link` pointing outside the page automatically gets a ↗ suffix from CSS. Don't add arrows by hand.
- Keep the existing accessibility behavior: `:focus-visible` rings, `aria-live` on the title block and the Re output, and SVG `role="img"` + `aria-label`. Reduced motion is respected in both CSS and JS (`reduceMotion`).
- Responsive layout uses one breakpoint (`max-width: 860px`): the page becomes one column, the panel is hidden, `#hero-frame` (the newest update's image, captioned "Latest · <title>") appears under the bio in its place, and index rows narrow their number and thumbnail columns. At every width an index row puts the year and tags on one line under the outcome.
- A `@media print` block at the end of `style.css` drops the navigation, panel and videos and prints outside links with their address; `beforeprint` / `afterprint` handlers in `script.js` open the folds and close them again.
- Units are written with a space ("216 g", "110 mm", "15 A") and date ranges with an en dash ("2024–2026"), in `script.js`, `index.html` and `lws-x/lws-x-full-story.md` alike.
- Link previews: the Open Graph tags in `index.html` use absolute URLs under `https://biscuitiv.github.io/portfolio/` and the 1200×630 `web/social-card.jpg` (a crop of the CFD velocity plot). Update them if the site moves. The `<noscript>` note in the index repeats the two contact links by hand, so update it with the `contact` array.

### Studio tokens

| Token | Value | Used for |
|---|---|---|
| `--paper` | #F7F7F5 | Page background; fill of cells, chips, frames and tooltips |
| `--paper-2` | #EDEDEA | `.tint` boxes, hovered index rows, dimension-label backing |
| `--ink` | #111214 | Text, `--line-strong`, the solid chip and pressed toggles |
| `--ink-2` | #5E5F63 | `.muted` text, `.kv` labels, the dashed baseline series (5.4:1 on `--paper-2`) |
| `--rule` | #D7D7D2 | `--line-soft` row separators, chart gridlines |
| `--edge` | #BEBEB8 | `--line` box edges and the 1px rules inside `.cells` |
| `--accent` | #2350D8 | Links on hover, `.cue`, markers, focus rings, the current-design chart series, dimension lines (6.1:1 on `--paper`, 5.6:1 on `--paper-2`) |
| `--font` / `--font-label` | "Inter Tight", system-ui, sans-serif | Text and titles / labels, data, buttons, chart text |
| `--t-12` `--t-18` `--t-24` `--t-40` | 12 / 18 / 24 / 40px | Labels / body / `.title-md`, `.subhead` / `.title-lg` |
| `--t-15` | 15px | `.caption` voice: meta lines, outcomes, result labels, captions |
| `--t-display` | clamp(56px, 7.4vw, 112px) | The name |
| `--t-project` | clamp(40px, 5.2vw, 72px) | Project titles |
| `--s-1` … `--s-8` | 4, 8, 12, 16, 24, 32, 48, 96px | All spacing |
| `--radius` / `--radius-sm` / `--radius-chip` | 4px / 2px / 3px | Boxes / other small parts / chips |
| `--article` | 960px | Project article width |
| `--dur` / `--dur-slow` / `--ease` | 110ms / 200ms / cubic-bezier(0.2, 0.7, 0.2, 1) | Hover and panel transitions |

Any new color must keep 4.5:1 against both `--paper` and `--paper-2` if it is used for 12px text. Record the ratio in a comment beside the token, as `--accent` does.

### Studio type voices

| Class | Font | Size | Weight | Case and tracking |
|---|---|---|---|---|
| body text | `--font` | `--t-18`, line-height 1.5 (1.6 in `.prose p`) | 400 | as written |
| `.mono` | `--font-label` | `--t-12` | 500 | uppercase, 0.06em, tabular figures |
| `.mono-data` | `--font-label` | `--t-12` | inherits | as written, 0.02em, tabular figures |
| `button.chip` | `--font-label` | `--t-12` | 600 | uppercase, 0.06em |
| `.title` | `--font` | `--t-18` | 500 | upright |
| `.title-md` / `.title-lg` | `--font` | 24 / 40px | 500 | `.title-lg` −0.02em |
| `.title-display` | `--font` | `--t-display`, line-height 0.9 | 600 | −0.03em |
| `.upright` | | | 600 | upright |
| `.subhead` | `--font` | `--t-24` | 600 | −0.01em |
| `.caption` (also `.entry-meta`, `.entry-desc`, `.part-outcome`, `.result-label`) | `--font` | `--t-15`, line-height 1.45 | inherits | sentence case |

### Studio states

- Index row hover or focus: `--paper-2` tint with `--radius-sm` corners; the title gets the accent underline (`.link`) and the part number the accent color (`.cue`).
- `.chip-solid` (the Projects button): ink fill with paper text; on hover or focus it turns accent.
- Section nav, current section (`aria-current="true"`): an outlined chip gets an accent border and text; the solid Projects chip turns accent. Once stuck, the nav shows a 1px `--edge` line under it, and the Projects chip drops to an outline while another section is current.
- Skill tags (`.tags .chip`) are labels, not buttons: `--paper-2` tint with no outline.
- `.chip[aria-pressed="true"]` (a pressed toggle chip, currently unused): ink fill with paper text.
- Focus ring: 2px solid accent, offset `--s-1`, `--radius-sm` corners.
- Dimension lines: accent, drawn in over `--dur-slow` while a row is previewed.

## Style options

In November 2026 six looks were compared with the same markup, type scale, spacing and layout. Studio was chosen and is what `style.css` now holds. The theme files were deleted after the choice; this section keeps enough to rebuild any of them. Contrast figures are for the accent against `--paper` / `--paper-2`; 12px accent labels need at least 4.5:1.

| Option | `--paper` / `--paper-2` / `--ink` / `--ink-2` / `--rule` | `--accent` | Fonts (text / labels) | Corners (`--radius` / `--radius-sm`) |
|---|---|---|---|---|
| Drafting (original) | #EEEAE0 / #E4DFD3 / #1C1B19 / #5A5750 / #C9C3B4 | red pencil #B02A17 (5.5 / 4.9) | Newsreader / IBM Plex Mono | 4px / 2px |
| **Studio (current)** | #F7F7F5 / #EDEDEA / #111214 / #5E5F63 / #D7D7D2, `--edge` #BEBEB8 | cobalt #2350D8 (6.1 / 5.6) | Inter Tight / Inter Tight | 4px / 2px |
| Night | #14161A / #1C1F24 / #ECEAE4 / #9A988F / #34373D, `--edge` #42464E | amber #F0A040 (8.5 / 7.7) | Fraunces / DM Mono | 14px / 8px |
| Editorial | #FBF9F4 / #F1EDE4 / #1E2421 / #5C635F / #DAD4C7 | forest #2E6B4A (6.0 / 5.4) | Source Serif 4 / Space Grotesk | 0 / 0 |
| Soft | #F4F3F8 / #EAE8F1 / #23212B / #625F6E / #D9D6E3 | violet #5B3FD1 (6.2 / 5.6) | Plus Jakarta Sans / Plus Jakarta Sans | 20px / 10px |
| Brutal | #FFFFFF / #F0F0F0 / #000000 / #4A4A4A / #BDBDBD | signal orange #C93400 (5.3 / 4.6) | Archivo / Space Mono | 0 / 0 |

What else set each one apart:
- **Drafting:** ink lines (`--line` 1px `--ink`, `.cells` rules in ink), italic `.title`, labels at 400 weight and 0.08em tracking, `--dur` 150ms / `--dur-slow` 250ms. `.grid-paper` drew a drafting grid in CSS centimeters (major lines every 1cm at rgba(28,27,25,0.16), minor every 2mm at 0.05), and a fixed `body::before` overlay added paper grain (an SVG `feTurbulence` noise at 0.08 opacity, `mix-blend-mode: multiply`).
- **Studio:** no grid and no grain; gray hairlines (`--edge`) on boxes and cell rules, with an ink rule kept under section and index heads; upright medium titles (display semibold); one sans for labels, data, buttons and charts, with tabular figures; labels 500 weight, 0.06em tracking; buttons 600; `--dur` 110ms / `--dur-slow` 200ms. A trial of 10px / 6px corners was reverted to the original rounding, and a trial with JetBrains Mono labels was replaced by Inter Tight.
- **Night:** dark mode (`color-scheme: dark`); soft `--edge` lines, `--ink-2` rule under heads; pill chips (`border-radius: 999px`); a hovered index row shows an inset 2px accent bar on its left edge.
- **Editorial:** square print corners; a 3px double ink rule under section and index heads; body line-height 1.6; grotesk labels at 500 weight, 0.1em tracking; italic titles kept.
- **Soft:** no ink outlines (`--line` uses `--rule`) and soft two-layer shadows on frames, figure plates and cell groups; pill chips; sentence-case labels (no uppercase); upright titles (600, display 700); slower motion (220ms / 420ms) with a slight overshoot ease, cubic-bezier(0.34, 1.3, 0.64, 1).
- **Brutal:** 2px ink lines everywhere (including 2px `.cells` gaps); hard offset shadows (6px on frames and plates, 3px on the solid button, which presses in on hover); heavy upright titles (700, display 900 in uppercase); 3px focus rings; near-instant linear motion (60ms / 120ms).

### Rebuilding an option

The Drafting stylesheet is the last version before Studio: `git show 86bc004:style.css` (with `index.html` from the same commit for its font link, and `.tint` renamed back to `.grid-paper` in the markup and `script.js`).

The other four were override files loaded after that Drafting stylesheet, each removing the grid and grain with `.grid-paper { background-image: none; }` and `body::before { display: none; }`. To try one on top of Studio instead, set the tokens from the table, load its fonts, and add the rules below. Studio already has no grid or grain, so those two lines aren't needed. Where an option keeps Drafting behavior that Studio changed (italic titles, ink lines, label weight), restore it explicitly.

Google Fonts `css2` family parameters:
- Drafting: `family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600`
- Studio: `family=Inter+Tight:ital,wght@0,400..700;1,400..700`
- Night: `family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=DM+Mono:wght@400;500`
- Editorial: `family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400..600&family=Space+Grotesk:wght@400;500`
- Soft: `family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800`
- Brutal: `family=Archivo:ital,wght@0,400..900;1,400..900&family=Space+Mono:wght@400;700`

Rules beyond the tokens, as they were written:

```css
/* Night */
:root { color-scheme: dark; --edge: #42464E; --line: 1px solid var(--edge); --radius: 14px; --radius-sm: 8px; }
.cells { background: var(--edge); }
.section-head, .index-head { border-bottom-color: var(--ink-2); }
.chip { border-radius: 999px; padding-inline: var(--s-3); }
.part:is(:hover, :focus-visible) { box-shadow: inset 2px 0 0 var(--accent); }

/* Editorial */
:root { --radius: 0; --radius-sm: 0; }
body { line-height: 1.6; }
.mono { letter-spacing: 0.1em; font-weight: 500; }
.section-head, .index-head { border-bottom: 3px double var(--ink); }

/* Soft */
:root {
    --line: 1px solid var(--rule);
    --radius: 20px;
    --radius-sm: 10px;
    --shadow: 0 1px 2px rgba(35, 33, 43, 0.06), 0 12px 32px -16px rgba(35, 33, 43, 0.28);
    --dur: 220ms;
    --dur-slow: 420ms;
    --ease: cubic-bezier(0.34, 1.3, 0.64, 1);
}
.cells { background: var(--rule); }
.frame, .fig-plate, .cells { box-shadow: var(--shadow); }
.title-block { box-shadow: none; }
.section-head, .index-head { border-bottom-color: var(--ink-2); }
.chip { border-radius: 999px; padding-inline: var(--s-3); }
.mono { text-transform: none; letter-spacing: 0.01em; font-weight: 500; }
.mono, .mono-data { font-variant-numeric: tabular-nums; }
.title { font-style: normal; font-weight: 600; }
.title-display { font-weight: 700; }

/* Brutal */
:root { --line: 2px solid var(--ink); --radius: 0; --radius-sm: 0; --dur: 60ms; --dur-slow: 120ms; --ease: linear; }
.cells { gap: 2px; }
.title-block { border-width: 2px 0 0 2px; }
:focus-visible { outline-width: 3px; }
.frame, .fig-plate { box-shadow: 6px 6px 0 var(--ink); }
.chip-solid { box-shadow: 3px 3px 0 var(--ink); }
.chip-solid:is(:hover, :focus-visible) { box-shadow: 1px 1px 0 var(--ink); transform: translate(2px, 2px); }
.title { font-style: normal; font-weight: 700; }
.upright { font-weight: 800; }
.title-display { font-weight: 900; text-transform: uppercase; letter-spacing: -0.04em; }
```

When comparing options side by side, load the override with a `?theme=<name>` query parameter rather than the hash, since the hash selects the project.

## Assets

Original photos and videos sit in `lws-x/` and `across-the-years/`. Web-encoded clips and their `.jpg` posters go in `lws-x/web/` and `across-the-years/web/` (H.264, no audio, `+faststart`, long side ≤ 1280). Many `lws-x/` filenames contain spaces: use `%20` in `src` strings built in JS (as with the ESC schematic). `across-the-years/` uses descriptive hyphenated names (`printer-*`, `vibration-tracker-*`, `radio-dock-*`, `drone-*`), and its media fills the `drones`, `printer` and `radio-dock` projects. `web/` at the repo root holds the headshot and the Aviation Club photos. The résumé PDFs at the repo root (`Resume 9_27_2026.pdf`, `Resume 11_5_2026.pdf`) are deliberately not linked from the site; the only linked PDF is the ESC schematic, `lws-x/ESC V1.pdf`.

## Checking changes

There are no automated tests. After a change:
- Load the home view and a project page (for example `#plane`, the LWS X write-up, which has every figure type) at desktop width and below 860px.
- Hover and Tab through the index rows: the panel preview, dimension lines, title block and focus rings should all update.
- Scroll the home view: the section nav should stick under the top edge, highlight each section as it reaches the nav, and land jumped-to headings just below it (also below 860px, where the one-row nav scrolls sideways).
- On LWS X, check the polar and sweep tooltips, the Reynolds sliders, the folds and the Contents buttons.
- Click a figure photo: the lightbox opens with its caption and closes on Esc, the Close button and a backdrop click. Scroll the article: the bar with Index, Prev and Next stays at the top, and Contents targets land below it.
- Scroll the index, open a project, then go back: the index returns to the same position.
- Open print preview on both views: one column, folds open, no panel or navigation.
- Turn on reduced motion in the OS: transitions stop and muted clips don't autoplay.
- For a new color, check its contrast against `--paper` and `--paper-2`.
