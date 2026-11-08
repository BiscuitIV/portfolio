# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal engineering portfolio for Pavlos P: a static, single-page site in three files (`index.html`, `style.css`, `script.js`). It has no build step, package manager, dependencies, linter or tests. The only external resource is Google Fonts (Inter Tight).

To preview it, serve the folder statically. The workspace is set up for the VS Code Live Server extension on port 5501 (`.vscode/settings.json`); `python -m http.server` also works. Check changes in a browser at both desktop width and below the 860px breakpoint.

| File | Holds |
|---|---|
| `index.html` | Both views' static markup: the hero, the résumé sections (education, experience, skills, activities, about), the panel skeleton and the project-view skeleton. Résumé text lives only here. |
| `style.css` | Tokens in `:root`, the primitives, then one section per area of the page (see "Code map"). |
| `script.js` | Aerodynamics data, the `projects` content model, the figure builders, and all DOM wiring (index, filter, panel, routing). |
| `lws-x/lws-x-full-story.md` | Long-form prose version of the LWS X write-up; not loaded by the site. |

## Architecture

**Two views, hash routing.** `index.html` holds both `#home-view` (the résumé index plus a fixed featured-part panel) and `#project-view` (one article column). `route()` in `script.js` runs on `hashchange`. If `#<key>` matches a key in `projects`, the project view is shown and rebuilt from data; any other hash shows the home view. Because the hash selects the project, in-article navigation (the Contents list) uses buttons that scroll to the heading, not `#anchor` links.

**`projects` is the content model.** Each entry in the `projects` object in `script.js` becomes one index row and one project page. Insertion order sets the "drawing number" (`drawingNumber(key)`, zero-padded), so reordering keys renumbers projects, and it also sets the "Next" link that ends each project page (the next key, wrapping). Optional fields:
- Index row: `subtitle`, `outcome` (one front-loaded result line), `thumb` (image path, decorative; rows without one show an empty `.tint` box), and `tags` (disciplines; their union, in first-seen order, builds the filter chips above the index, and untagged projects show only under "All").
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

**Home hero and section nav.** The intro (`header.intro`) holds the name, a one-line value prop (`.lede`, also in `<meta name="description">`) and the bio list. Directly after it, as a child of `.sheet-left` rather than the header (so `position: sticky` spans the whole column), is the `#jump` section nav: one button per section (`data-jump="<heading id>"`, Projects as the solid `.chip-solid` primary, the rest outlined chips) that scrolls to and focuses that heading through `jumpTo()` (not `#anchor` links, since the hash selects the project; the Contents nav uses the same helper). The nav sticks to the top of the left column while the résumé scrolls. `updateJumpNav()` (run on scroll through `requestAnimationFrame`, and on resize and hash changes) adds `.is-stuck` for the hairline under it and sets `aria-current="true"` on the button for the section being read: the last section whose top has passed the nav, or the last section at the page end. A `ResizeObserver` writes the nav's height to `--jump-h` on `#home-view`, and `.sheet-left .section-head` uses it as `scroll-margin-top` so jumped-to headings land below the nav. The nav is always one row; when the column is too narrow for every button (always below 860px, sometimes on narrow desktops) the row scrolls sideways and is scrolled to keep the current button visible. The hero has no contact links; they appear in the About section, the panel title block and the project footer. The `.about` section at the end of the left column holds the portrait beside a short first-person intro and the contact links. The portrait is `web/headshot.jpg`, a 384×480 (4:5, 2× display) crop of the original `Headshot.jpeg` at the repo root; re-export it from the original rather than pointing the page at the full-size file. `outcome` strings may wrap their headline result in `<strong>`.

**Home panel.** When idle, the panel shows the `featured` part (a constant next to `contact`). Hovering or focusing an index row calls `showPreview(key)` to preview that part instead, and leaving calls `hidePreview()`, which returns to the featured part. `fillPanel(key, label)` owns the contents: the part's `image` (or `thumb`) in the frame link with a caption, or the excerpt card for a part with neither, plus its first three `results` as stat cells. A part's `video` covers the frame once it plays. Experience rows have no panel behavior. `previewToken` cancels stale async video loads, so bump it in any new code that changes the panel. The title block (`setTitleBlock`) and the dimension-line labels are updated from the same calls. Below 860px the panel is hidden.

Panel sequence in detail:
- `activatePanel(info)` bumps `previewToken`, clears the pending video timer, writes the frame's measured width and height into the dimension labels (`#dim-w`, `#dim-h`), adds `.is-active` to `#frame-wrap` (which draws the dimension lines) and fills the title block.
- `showPreview(key)` calls `activatePanel`, then `fillPanel`. If the part has a `video`, it waits 200ms, sets the source on `#featured-video` and shows it (`.visible`) only if the token still matches. If playback fails, it falls back to the excerpt card with "Render unavailable in this browser."
- `hidePreview()` bumps the token, removes `.is-active`, resets the title block to "Portfolio index" / "00" / "2026", refills the featured part, and unloads the video after 300ms.
- `fillProjectCard(key, excerptText)` fills the excerpt card (`#card-meta`, `#card-title`, `#card-body`). For a part with no image, the excerpt is the first `text` paragraph with its markup stripped.

**Single sources.** The `contact` array fills every `.contact-links` element in both views. Résumé entries (education, roles, skills, activities) live only in `index.html`.

**Aerodynamics data.** The `airfoils` (profile coordinates and XFoil polars), `sweep` (275-foil batch ranking), `air(h)` (ISA plus Sutherland) and `reynolds()` blocks at the top of `script.js` feed the charts, the Reynolds calculator and one spec row. Comments there record the data provenance and solver settings, so keep them accurate. The polar charts and the sweep scatter each render inline SVG at the measured container width using a `ResizeObserver`, with a pointer-hover tooltip.

**Facts live in several places.** LWS X numbers (masses, speeds, Cl/Cd, airfoil counts) appear in the `outcome`, `problem`, `results`, `specs` and `text` entries in `script.js`, and in `lws-x/lws-x-full-story.md`, a long-form prose version of the same write-up. When a figure changes, update every copy.

## Code map

**`script.js`, top to bottom:**
- Data: `airfoils`, `sweep`, `air(h)`, `reynolds(v, h)`, `formatRe(re)`, then `projects` (keys in drawing order: `plane` for LWS X, `printer`, `drone-frame`, `drones`, `radio-dock`), `contact` and `featured` (the key the idle panel shows, currently `"plane"`).
- Helpers: `projectKeys`, `drawingNumber(key)`, `makeFigure(plateClass, plateHTML, caption)` (wraps a builder's output in `.fig-plate.tint` plus a caption), `reduceMotion` (a `matchMedia` query), `jumpTo(el)`, `clipPlayer` (an `IntersectionObserver` that plays muted clips while at least half on screen), `mediaFigure(items, caption)`, `stepRows(steps)`, `niceTicks(min, max, count)`, `polarCharts` with `polarPanel(chart)` and `polarSummary()`.
- `figures`: one builder per `{ figure: name }`. `airfoils()` draws a true-scale section overlay (SVG units are mm), `polars()` the Cl/Cd charts and summary table, `timeline()` the generation steps, `sweep()` the 273-foil scatter, `reynolds()` the calculator with altitude and speed sliders.
- `kvPair([label, value], dtClass, ddClass)` and `renderSpecs(container, { title, groups })`.
- One `DOMContentLoaded` handler, in this order: contact links, `setTitleBlock`, the panel functions, the section nav (`jumps`, `updateJumpNav()`), index generation, the discipline filter, then `route()` (summary, results, hero media, specs, `renderItem()` for the text array, the Next link, the Contents nav), bound to `hashchange` and run once on load.

**`index.html` ids that the script fills or watches:** `#jump` (section nav), `#project-links-container` (index `<ol>`), `#project-filter`, `#frame-wrap`, `#frame`, `#frame-card` (`#card-meta`, `#card-title`, `#card-body`), `#featured-video`, `#panel-results`, `#dim-w`, `#dim-h`, `#tb-title`, `#tb-no`, `#tb-date`; in the project view `#project-no`, `#project-title`, `#project-subtitle`, `#project-summary`, `#project-results`, `#project-figure` (`#project-video`, `#project-image`, `#project-caption`), `#project-specs` (`#specs-head`), `#project-description-container`. Section heading ids (`projects-head`, `education-head`, `experience-head`, `skills-head`, `activities-head`, `about-head`) are the `data-jump` targets.

**`style.css` sections, in order:** tokens (`:root`) and base (`html`, `body`, `a`, `:focus-visible`); Primitives; Home: left column; Home: featured-part panel (frame, dimension lines, title block); Project view (bar, head, summary, prose, Contents, footer); Project spec sheet; Project figures (plates, polars, sweep, timeline pipeline, Reynolds calculator); the 860px media query; the reduced-motion query, which zeroes every transition.

## Styling conventions

- The theme is "Studio": light gray paper, near-black ink, gray hairlines and one cobalt accent (`--accent`), all in Inter Tight. The layout and the site's terms still come from a drafting sheet: "Dwg no.", title block, dimension lines, "parts" for projects. Alternatives that were tried are recorded under "Style options" below.
- Use the tokens in `:root` (colors, `--font`/`--font-label`, the `--t-*` type scale, the `--s-*` spacing scale, `--line`/`--line-strong`/`--line-soft`, `--radius`/`--radius-sm`/`--radius-chip`, `--dur`/`--ease`) rather than raw values. `--line` is the `--edge` hairline on boxes, chips and thumbnails; `--line-strong` is the ink rule under section and index heads; `--line-soft` separates list rows. `--radius` rounds boxes (frames, figure plates, `.cells` groups) and `--radius-sm` rounds small parts (thumbnails, tooltips, the row tint, focus rings). Chips (buttons, filters, skill tags) use `--radius-chip` (3px), between the two, so they read as buttons. Rules and lines stay square.
- The "Primitives" section of `style.css` is what components are built from; compose them before adding new classes:
  - Voices: `.mono` (uppercase labels, medium weight), `.mono-data` (keeps case for units); both use `--font-label` with tabular figures, and the name is historical (no monospace font is loaded). Also `.muted`, `.title` + size modifiers (upright, medium; the display name is semibold), `.upright` (semibold for scanned titles), `.subhead`.
  - Interaction: `.link` (accent underline), `.cue` (accent label color). Both trigger on themselves or on a hovered or focused `a`/`button` ancestor.
  - Structure: `.kv` (label/value grid), `.cells` (1px `--edge` rules between children), `.stat` (label over value cell), `.marks` (accent-marker bullets), `.chip` (ruled label; `button.chip` is semibold; with `aria-pressed` it is a toggle), `.bare` (button reset; it comes first so the other primitives override it), `.fold` (`<details>`), `.tint` (plain `--paper-2` fill for the panel, figure plates and empty thumbnails), `.section-head`.
  - In JS, `kvPair([label, value], dtClass, ddClass)` builds every generated `<dt>`/`<dd>`.
- `a.link` pointing outside the page automatically gets a ↗ suffix from CSS. Don't add arrows by hand.
- Keep the existing accessibility behavior: `:focus-visible` rings, `aria-live` on the title block and the Re output, and SVG `role="img"` + `aria-label`. Reduced motion is respected in both CSS and JS (`reduceMotion`).
- Responsive layout uses one breakpoint (`max-width: 860px`): the page becomes one column, the panel is hidden, and index rows drop the year under the outcome.

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
| `--t-display` | clamp(56px, 7.4vw, 112px) | The name and project titles |
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

### Studio states

- Index row hover or focus: `--paper-2` tint with `--radius-sm` corners; the title gets the accent underline (`.link`) and the part number the accent color (`.cue`).
- `.chip-solid` (the Projects button): ink fill with paper text; on hover or focus it turns accent.
- Section nav, current section (`aria-current="true"`): an outlined chip gets an accent border and text; the solid Projects chip turns accent. Once stuck, the nav shows a 1px `--edge` line under it.
- `.chip[aria-pressed="true"]` (the active filter): ink fill with paper text.
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
- Turn on reduced motion in the OS: transitions stop and muted clips don't autoplay.
- For a new color, check its contrast against `--paper` and `--paper-2`.
