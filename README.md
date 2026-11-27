# BlogIt

A calm reader mode for Chrome. Open any article, press `Alt + R`, and read it in a clean, blog-style view.

**[Add to Chrome](https://chromewebstore.google.com/detail/dpkggdhfpbniijnibnbkmnjjocolkcnk)** · [Website](https://blogit-site.vercel.app) · [Privacy policy](https://blogit-site.vercel.app/privacy.html)

[![BlogIt demo video](https://img.youtube.com/vi/maUjFVwDGQw/maxresdefault.jpg)](https://youtu.be/maUjFVwDGQw)

## What it does

- Strips ads, pop-ups, sidebars and cookie banners from an article and shows just the story.
- Two low-glare themes: warm paper and warm charcoal.
- Saves articles to a small library on your device so you can read them later.
- Text size, theme, save and close controls. Nothing else.

## Shortcuts

| Key | Action |
| --- | --- |
| `Alt + R` | Open or close reader mode |
| `Ctrl/Cmd + S` | Save the article |
| `Esc` | Close the reader |

Change the shortcut at `chrome://extensions/shortcuts`.

## Privacy

No account, no analytics, no server. Saved articles stay in your browser's local storage. BlogIt uses only `activeTab`, `scripting` and `storage`, and it runs on a page only when you click the icon or press the shortcut.

## Build from source

```bash
bun install
bun run build
```

Then open `chrome://extensions`, turn on Developer mode, click Load unpacked, and pick the `dist` folder. `npm install` and `npm run build` work too.

Built with React, TypeScript, Vite, Mozilla Readability and Radix Themes.
