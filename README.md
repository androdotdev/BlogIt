# BlogIt

**A calm reader mode for any webpage.**

BlogIt turns cluttered article pages into a focused, blog-style reading view. It extracts the story, drops the furniture, and renders it inside an isolated Shadow DOM overlay — then lets you keep the pieces you want in a small local library.

Built with React, TypeScript, Vite, Mozilla Readability, and **Radix Themes**, with two deliberately low-glare themes.

---

## What it does

- **Reader mode anywhere** — works on articles, essays, blog posts, and long-form pages on any `http(s)` site.
- **Clean extraction** — Mozilla Readability finds the article; BlogIt removes repeated bylines, kickers, cookie banners, ads, and other page noise.
- **Warm light + warm dark** — a cream paper theme and a warm charcoal theme. No stark white, no pitch black.
- **A real reading layout** — editorial serif type, ~70-character measure, a gentle drop cap, quiet links, and responsive type.
- **Save articles locally** — bookmark the current page from reader mode and it joins your library, stored with `chrome.storage.local`.
- **Read saved pieces later** — your library opens each article in the same full-page reading view.
- **Minimal controls** — text size, theme, save, close. That's it.
- **Keyboard friendly** — `Esc` closes the reader, `⌘/Ctrl + S` saves, `Alt + R` toggles reader mode on the active tab.

## Install (unpacked)

```bash
cd blogit
npm install
npm run build
```

Then in Chrome (or any Chromium browser):

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `blogit/dist` folder.
4. Pin **BlogIt** to the toolbar.

> BlogIt only runs on a tab when you click the toolbar icon or press `Alt + R`. It uses the `activeTab` permission, so it has no access to any page until you ask.

## Using BlogIt

1. Open any article or blog post.
2. Click the BlogIt toolbar icon and choose **Start reading**, or press `Alt + R`.
3. Use the toolbar to:
   - decrease / increase text size
   - switch between light and dark
   - save the article
   - close the reader
4. Open the popup to find everything you've saved. Click a saved article to open it in the reader page.

The shortcut can be changed at `chrome://extensions/shortcuts`.

## Themes

BlogIt has exactly two themes, and both are tuned for long reading sessions:

| Theme | Background | Text | Accent |
| --- | --- | --- | --- |
| Warm paper (light) | `#f2ede2` | `#433a2e` | terracotta `#a94f2c` |
| Warm charcoal (dark) | `#15130f` | `#d5cbbb` | ember `#e08a5e` |

Themes follow your system preference on first run. Once you choose one, that choice is remembered. Theme tokens live in [`src/styles/reader.css`](src/styles/reader.css) and [`src/popup/popup.css`](src/popup/popup.css).

## Where your articles live

Everything is local to your browser. There is no account, backend, analytics, or sync.

- Saved articles: `chrome.storage.local` key `blogit:saved`
- Preferences: `chrome.storage.local` key `blogit:settings`

Each saved article stores its title, byline, site, excerpt, reading time, sanitized HTML content, and a lead image URL. Remote images are loaded from their original hosts when you read.

The small helper in [`src/lib/storage.ts`](src/lib/storage.ts) uses `chrome.storage.local` in the extension and falls back to `localStorage` when the UI is run outside an extension context.

## Project layout

```
blogit/
├── public/
│   ├── manifest.json          # Manifest V3
│   ├── background.js          # keyboard shortcut bridge
│   └── icons/                 # 16-128px PNG icons
├── src/
│   ├── components/
│   │   ├── ReaderView.tsx     # shared reader + loading/error states
│   │   └── icons.tsx          # inline icon set + logo mark
│   ├── content/
│   │   └── index.tsx          # Shadow DOM overlay + message bridge
│   ├── lib/
│   │   ├── extract.ts         # Readability + title cleanup
│   │   ├── sanitize.ts        # DOMPurify + URL/noise cleanup
│   │   ├── storage.ts         # local library + settings
│   │   └── types.ts
│   ├── popup/
│   │   ├── Popup.tsx          # Radix popup + saved library
│   │   └── popup.css
│   ├── reader/
│   │   ├── ReaderPage.tsx     # saved-article full page
│   │   └── main.tsx
│   └── styles/
│       └── reader.css         # reader design system (light/dark)
├── index.html                 # popup entry
├── reader.html                # saved-article reader entry
├── vite.config.ts             # popup + reader pages
└── vite.content.config.ts     # single-file IIFE content script
```

## Development

```bash
npm install
npm run dev          # popup/reader UI in the Vite dev server
npm run typecheck    # TypeScript
npm run build        # pages + content script → dist/
```

The content script must be a single classic script, so it is built separately as an IIFE by `vite.content.config.ts`. It injects a Shadow DOM host, adopts the Radix + reader stylesheets as constructable stylesheets, and mounts the same `ReaderView` used by the saved reader page.

Saved content is cleaned at extraction (DOMPurify, plus URL and noise filtering), converted to Markdown, rendered with `marked`, and sanitized again with DOMPurify before it reaches the DOM. Inline styles, scripts, forms, iframes, event handlers, and non-image data URLs are stripped.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Lets BlogIt read the current tab after you click the icon or press the shortcut. |
| `scripting` | Injects the reader script into that tab on demand. |
| `storage` | Keeps your saved articles and settings on your device. |

There are no host permissions and no always-on content scripts.

See [`site/privacy.html`](site/privacy.html) for the privacy policy.

## Notes & limits

- Browser-internal pages (`chrome://…`, the Chrome Web Store) can't run content scripts, so reader mode isn't available there.
- Some pages — dashboards, feeds, search results, paywalled stubs — don't contain enough article text to extract. BlogIt shows a friendly error instead of a broken reader.
- Saved pages keep their original image URLs. If a site removes an image later, it may show as broken.
- Reader mode adds an overlay rather than rewriting the page, so closing it returns you exactly where you were.
