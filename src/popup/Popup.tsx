import { useEffect, useMemo, useState } from 'react'
import { Button, Kbd, SegmentedControl, Theme } from '@radix-ui/themes'
import {
  BookmarkFilledIcon,
  BookOpenIcon,
  LibraryIcon,
  LockIcon,
  LogoMark,
  MoonIcon,
  SunIcon,
  TrashIcon,
} from '../components/icons'
import {
  clearSavedArticles,
  formatSavedDate,
  getDomain,
  getSavedArticles,
  getSettings,
  removeSavedArticle,
  saveSettings,
} from '../lib/storage'
import type { MessageResponse, SavedArticle, ThemeMode } from '../lib/types'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

function Thumb({ article }: { article: SavedArticle }) {
  const [failed, setFailed] = useState(false)
  const letter = (article.siteName || article.title).trim().charAt(0).toUpperCase() || 'B'

  return (
    <div className="saved-thumb" aria-hidden="true">
      {article.image && !failed ? (
        <img src={article.image} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{letter}</span>
      )}
    </div>
  )
}

function openSavedArticle(article: SavedArticle) {
  const path = `reader.html?id=${encodeURIComponent(article.id)}`

  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url: chrome.runtime.getURL(path) })
  } else {
    window.open(`/${path}`, '_blank', 'noopener')
  }
}

function sendToggle(tabId: number): Promise<MessageResponse | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'BLOGIT_TOGGLE' }, (reply) => {
      if (chrome.runtime.lastError) {
        resolve(undefined)
        return
      }
      resolve(reply as MessageResponse | undefined)
    })
  })
}

async function toggleReaderOnActiveTab(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    throw new Error('Chrome APIs unavailable')
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error('No active tab')

  let response = await sendToggle(tab.id)

  // Tabs that were already open when the extension was installed or reloaded
  // have no content script yet. Inject it on demand instead of making the
  // reader feel broken until the page is refreshed.
  if (!response?.ok && chrome.scripting?.executeScript) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      })
      response = await sendToggle(tab.id)
    } catch {
      // Restricted page (chrome://, Web Store, PDF viewer, …). Fall through.
    }
  }

  if (!response?.ok) throw new Error('Reader mode unavailable')
}

export function Popup() {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  const [saved, setSaved] = useState<SavedArticle[]>([])
  const [loaded, setLoaded] = useState(false)
  const [starting, setStarting] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const shortcut = isMac ? '⌥' : 'Alt'

  useEffect(() => {
    let cancelled = false

    Promise.all([getSettings(), getSavedArticles()]).then(([settings, articles]) => {
      if (cancelled) return
      setTheme(settings.theme)
      setSaved(articles)
      setLoaded(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    document.body.style.background = theme === 'dark' ? '#141210' : '#f2ede2'
  }, [theme])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 6000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!confirmClear) return
    const timer = window.setTimeout(() => setConfirmClear(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmClear])

  const applyTheme = (next: ThemeMode) => {
    setTheme(next)
    void saveSettings({ theme: next })
  }

  const startReading = async () => {
    setStarting(true)
    setNotice('')
    try {
      await toggleReaderOnActiveTab()
      window.close()
      // If this page is being viewed in a normal tab, window.close() may be
      // ignored; don't leave the button stuck on "Opening…".
      window.setTimeout(() => setStarting(false), 800)
    } catch {
      setNotice('Reader mode isn’t available on this tab. Try a regular article or blog post.')
      setStarting(false)
    }
  }

  const removeArticle = async (article: SavedArticle) => {
    await removeSavedArticle(article.id)
    setSaved((current) => current.filter((item) => item.id !== article.id))
  }

  const clearLibrary = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    await clearSavedArticles()
    setSaved([])
    setConfirmClear(false)
  }

  const totalMinutes = useMemo(
    () => saved.reduce((total, article) => total + article.readingTime, 0),
    [saved],
  )

  return (
    <Theme
      appearance={theme}
      accentColor="orange"
      grayColor="sand"
      radius="large"
      scaling="100%"
      hasBackground={false}
      data-appearance={theme}
      className="blogit-pop-theme"
    >
      <div className="blogit-pop">
        <header className="pop-header">
          <div className="pop-brand">
            <LogoMark size={34} />
            <div className="pop-brand-text">
              <span className="pop-name">BlogIt</span>
              <span className="pop-tag">Reader mode</span>
            </div>
          </div>

          <SegmentedControl.Root
            value={theme}
            onValueChange={(value) => applyTheme(value as ThemeMode)}
            size="1"
            aria-label="Appearance"
            className="theme-switch"
          >
            <SegmentedControl.Item value="light" title="Light theme" aria-label="Light theme">
              <SunIcon size={14} />
            </SegmentedControl.Item>
            <SegmentedControl.Item value="dark" title="Dark theme" aria-label="Dark theme">
              <MoonIcon size={14} />
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </header>

        <section className="pop-hero">
          <p className="hero-eyebrow">A calmer way to read</p>
          <h1 className="hero-title">Turn any page into a blog.</h1>
          <p className="hero-copy">
            Strip the ads, sidebars, and noise. Keep just the words — in a warm, focused reading
            view.
          </p>

          <Button
            size="3"
            className="start-button"
            onClick={() => void startReading()}
            loading={starting}
            disabled={starting}
          >
            <BookOpenIcon size={17} />
            {starting ? 'Opening…' : 'Start reading'}
            <span className="start-shortcut">
              <Kbd>{shortcut}</Kbd>
              <span>+</span>
              <Kbd>R</Kbd>
            </span>
          </Button>

          {notice ? (
            <p className="pop-notice" role="status">
              {notice}
            </p>
          ) : null}

          <p className="hero-footnote">
            <BookmarkFilledIcon size={11} />
            Light &amp; dark themes · Saved on this device
          </p>
        </section>

        <section className="pop-library">
          <div className="library-head">
            <div className="library-title">
              <span>Saved</span>
              {loaded && saved.length > 0 ? <span className="library-count">{saved.length}</span> : null}
            </div>
            {loaded && saved.length > 0 ? (
              <button
                type="button"
                className={`clear-button${confirmClear ? ' is-confirming' : ''}`}
                onClick={() => void clearLibrary()}
              >
                {confirmClear ? 'Click to confirm' : 'Clear all'}
              </button>
            ) : null}
          </div>

          {!loaded ? (
            <div className="saved-skeletons" aria-hidden="true">
              <div className="saved-skeleton" />
              <div className="saved-skeleton" />
            </div>
          ) : saved.length === 0 ? (
            <div className="library-empty">
              <span className="empty-icon">
                <LibraryIcon size={17} />
              </span>
              <p className="empty-title">Your library is empty</p>
              <p className="empty-text">
                Save an article from reader mode and it will be waiting for you here.
              </p>
            </div>
          ) : (
            <ul className="saved-list">
              {saved.map((article) => (
                <li key={article.id} className="saved-row">
                  <button
                    type="button"
                    className="saved-open"
                    onClick={() => openSavedArticle(article)}
                    title={`Open “${article.title}”`}
                  >
                    <Thumb article={article} />
                    <span className="saved-text">
                      <span className="saved-title">{article.title}</span>
                      <span className="saved-meta">
                        <span className="saved-domain">{getDomain(article.url)}</span>
                        <span className="saved-meta-dot" aria-hidden="true" />
                        <span>{article.readingTime} min</span>
                        <span className="saved-meta-dot" aria-hidden="true" />
                        <span>{formatSavedDate(article.savedAt)}</span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="saved-delete"
                    onClick={() => void removeArticle(article)}
                    aria-label={`Remove ${article.title} from library`}
                    title="Remove from library"
                  >
                    <TrashIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {loaded && saved.length > 0 ? (
            <p className="library-total">
              {saved.length} {saved.length === 1 ? 'article' : 'articles'} · {totalMinutes} min of
              reading tucked away
            </p>
          ) : null}
        </section>

        <footer className="pop-footer">
          <span className="footer-left">
            <LockIcon size={11} />
            Stored locally in your browser
          </span>
          <span className="pop-version">v1.0</span>
        </footer>
      </div>
    </Theme>
  )
}
