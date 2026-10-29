# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal engineering portfolio for Pavlos P: a static, single-page site in three files (`index.html`, `style.css`, `script.js`). It has no build step, package manager, dependencies, linter or tests. The only external resource is Google Fonts (Newsreader and IBM Plex Mono).

To preview it, serve the folder statically. The workspace is set up for the VS Code Live Server extension on port 5501 (`.vscode/settings.json`); `python -m http.server` also works. Check changes in a browser at both desktop width and below the 860px breakpoint.

## Architecture

**Two views, hash routing.** `index.html` holds both `#home-view` (the résumé index plus a fixed featured-part panel) and `#project-view` (one article column). `route()` in `script.js` runs on `hashchange`. If `#<key>` matches a key in `projects`, the project view is shown and rebuilt from data; any other hash shows the home view. Because the hash selects the project, in-article navigation (the Contents list) uses buttons that scroll to the heading, not `#anchor` links.

**`projects` is the content model.** Each entry in the `projects` object in `script.js` becomes one index row and one project page. Insertion order sets the "drawing number" (`drawingNumber(key)`, zero-padded), so reordering keys renumbers projects, and it also sets the "Next" link that ends each project page (the next key, wrapping). Optional fields:
- Index row: `subtitle`, `outcome` (one front-loaded result line), `thumb` (image path, decorative; rows without one show an empty grid-paper box), and `tags` (disciplines; their union, in first-seen order, builds the filter chips above the index, and untagged projects show only under "All").
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

**Home hero.** The intro holds a one-line value prop (`.lede`, also in `<meta name="description">`), the bio list, and a `.cta` row: `#view-work`, a button that scrolls to and focuses `#projects-head` (not a `#anchor`, since the hash selects the project), followed by the contact links. The `.about` section at the end of the left column holds the portrait beside a short first-person intro, the sign-off and the contact links. The portrait is `web/headshot.jpg`, a 384×480 (4:5, 2× display) crop of the original `Headshot.jpeg` at the repo root; re-export it from the original rather than pointing the page at the full-size file. `outcome` strings may wrap their headline result in `<strong>`.

**Home panel.** When idle, the panel shows the `featured` part (a constant next to `contact`). Hovering or focusing an index row calls `showPreview(key)` to preview that part instead, and leaving calls `hidePreview()`, which returns to the featured part. `fillPanel(key, label)` owns the contents: the part's `image` (or `thumb`) in the frame link with a caption, or the excerpt card for a part with neither, plus its first three `results` as stat cells. A part's `video` covers the frame once it plays. Experience rows have no panel behavior. `previewToken` cancels stale async video loads, so bump it in any new code that changes the panel. The title block (`setTitleBlock`) and the dimension-line labels are updated from the same calls. Below 860px the panel is hidden.

**Single sources.** The `contact` array fills every `.contact-links` element in both views. Résumé entries (education, roles, skills, activities) live only in `index.html`.

**Aerodynamics data.** The `airfoils` (profile coordinates and XFoil polars), `sweep` (275-foil batch ranking), `air(h)` (ISA plus Sutherland) and `reynolds()` blocks at the top of `script.js` feed the charts, the Reynolds calculator and one spec row. Comments there record the data provenance and solver settings, so keep them accurate. The polar charts and the sweep scatter each render inline SVG at the measured container width using a `ResizeObserver`, with a pointer-hover tooltip.

**Facts live in several places.** LWS X numbers (masses, speeds, Cl/Cd, airfoil counts) appear in the `outcome`, `problem`, `results`, `specs` and `text` entries in `script.js`, and in `lws-x/lws-x-full-story.md`, a long-form prose version of the same write-up. When a figure changes, update every copy.

## Styling conventions

- The theme is a drafting sheet: paper, graphite ink and one red-pencil accent (`--accent`). The site's terms follow it: "Dwg no.", title block, dimension lines, "parts" for projects.
- Use the tokens in `:root` (colors, the `--t-*` type scale, the `--s-*` spacing scale, `--line`, `--radius`/`--radius-sm`, `--dur`/`--ease`) rather than raw values. `--radius` rounds boxes (frames, figure plates, `.cells` groups) and `--radius-sm` rounds small parts (chips, thumbnails, tooltips, the row tint, focus rings). Rules and lines stay square.
- The "Primitives" section of `style.css` is what components are built from; compose them before adding new classes:
  - Voices: `.mono` (uppercase labels), `.mono-data` (keeps case for units), `.muted`, `.title` + size modifiers, `.upright` (semibold upright for scanned titles; italic stays for display titles), `.subhead`.
  - Interaction: `.link` (red underline), `.cue` (red label color). Both trigger on themselves or on a hovered or focused `a`/`button` ancestor.
  - Structure: `.kv` (label/value grid), `.cells` (1px ink rules between children), `.stat` (label over value cell), `.marks` (red-marker bullets), `.chip` (ruled paper label; with `aria-pressed` it is a toggle), `.bare` (button reset; it comes first so the other primitives override it), `.fold` (`<details>`), `.grid-paper`, `.section-head`.
  - In JS, `kvPair([label, value], dtClass, ddClass)` builds every generated `<dt>`/`<dd>`.
- `a.link` pointing outside the page automatically gets a ↗ suffix from CSS. Don't add arrows by hand.
- Keep the existing accessibility behavior: `:focus-visible` rings, `aria-live` on the title block and the Re output, and SVG `role="img"` + `aria-label`. Reduced motion is respected in both CSS and JS (`reduceMotion`).
- Responsive layout uses one breakpoint (`max-width: 860px`): the page becomes one column, the panel is hidden, and index rows drop the year under the outcome.

## Assets

Original photos and videos sit in `lws-x/` and `across-the-years/`. Web-encoded clips and their `.jpg` posters go in `lws-x/web/` and `across-the-years/web/` (H.264, no audio, `+faststart`, long side ≤ 1280). Many `lws-x/` filenames contain spaces: use `%20` in `src` strings built in JS (as with the ESC schematic). `across-the-years/` uses descriptive hyphenated names (`printer-*`, `vibration-tracker-*`, `radio-dock-*`, `drone-*`), and its media fills the `drones`, `printer` and `radio-dock` projects. `Resume 9_27_2026.pdf` is at the repo root and is deliberately not linked from the site.
