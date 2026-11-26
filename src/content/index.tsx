import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import radixCss from '@radix-ui/themes/styles.css?inline'
import readerCss from '../styles/reader.css?inline'
import { ReaderState, ReaderView } from '../components/ReaderView'
import { extractArticle } from '../lib/extract'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  articleId,
  clamp,
  getSettings,
  isArticleSaved,
  removeSavedArticle,
  saveArticle,
  saveSettings,
  subscribeToStorage,
} from '../lib/storage'
import type {
  ArticleData,
  ExtensionMessage,
  MessageResponse,
  Settings,
} from '../lib/types'

const HOST_ID = 'blogit-reader-root'
const HOST_STYLE = [
  'position: fixed',
  'inset: 0',
  'z-index: 2147483647',
  'display: block',
  'width: 100%',
  'height: 100%',
  'margin: 0',
  'padding: 0',
  'border: 0',
  'background: transparent',
  'overscroll-behavior: contain',
].join('; ')

let activeReader: { close: () => void } | null = null
let opening = false

interface ContentAppProps {
  initialSettings: Settings
  onClose: () => void
}

function ContentApp({ initialSettings, onClose }: ContentAppProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [article, setArticle] = useState<ArticleData | null>(null)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState(initialSettings)
  const [saved, setSaved] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const articleRef = useRef<ArticleData | null>(null)

  useEffect(() => {
    articleRef.current = article
  }, [article])

  useEffect(() => {
    setStatus('loading')
    setError('')

    // Give the overlay one frame to paint, so extraction feels intentional.
    const timer = window.setTimeout(() => {
      try {
        const extracted = extractArticle()
        setArticle(extracted)
        setStatus('ready')
        void isArticleSaved(extracted.url).then(setSaved)
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'BlogIt couldn’t read this page. Try a different article.',
        )
        setStatus('error')
      }
    }, 60)

    return () => window.clearTimeout(timer)
  }, [attempt])

  useEffect(
    () =>
      subscribeToStorage((payload) => {
        if (payload.settings) {
          setSettings({
            theme: payload.settings.theme,
            fontSize: clamp(payload.settings.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
          })
        }
        if (payload.saved) {
          const current = articleRef.current
          setSaved(current ? payload.saved.some((item) => item.id === articleId(current.url)) : false)
        }
      }),
    [],
  )

  const changeTheme = () => {
    const theme = settings.theme === 'dark' ? 'light' : 'dark'
    setSettings((current) => ({ ...current, theme }))
    void saveSettings({ theme })
  }

  const changeFontSize = (size: number) => {
    const fontSize = clamp(size, MIN_FONT_SIZE, MAX_FONT_SIZE)
    setSettings((current) => ({ ...current, fontSize }))
    void saveSettings({ fontSize })
  }

  const toggleSave = async (): Promise<string> => {
    const current = articleRef.current
    if (!current) return 'Nothing to save yet'

    if (saved) {
      await removeSavedArticle(articleId(current.url))
      setSaved(false)
      return 'Removed from your library'
    }

    const result = await saveArticle(current)
    setSaved(true)
    return result.created ? 'Saved to your library' : 'Updated in your library'
  }

  if (status === 'error') {
    return (
      <ReaderState
        theme={settings.theme}
        variant="error"
        title="No article found"
        message={error}
        onRetry={() => setAttempt((value) => value + 1)}
        onClose={onClose}
      />
    )
  }

  if (status === 'loading' || !article) {
    return (
      <ReaderState
        theme={settings.theme}
        variant="loading"
        title="Preparing your reading view"
        message="Finding the story, clearing the clutter…"
      />
    )
  }

  return (
    <ReaderView
      article={article}
      context="overlay"
      theme={settings.theme}
      fontSize={settings.fontSize}
      saved={saved}
      onThemeChange={changeTheme}
      onFontSizeChange={changeFontSize}
      onToggleSave={toggleSave}
      onClose={onClose}
    />
  )
}

function openReader(initialSettings: Settings) {
  if (activeReader || document.getElementById(HOST_ID)) return

  const scrollX = window.scrollX
  const scrollY = window.scrollY
  const rootElement = document.documentElement
  const previousOverflow = rootElement.style.overflow
  const previousOverscroll = rootElement.style.overscrollBehavior
  const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const pageBody = document.body
  const bodyWasInert = pageBody?.inert ?? false

  rootElement.style.overflow = 'hidden'
  rootElement.style.overscrollBehavior = 'none'
  if (pageBody) pageBody.inert = true

  const host = document.createElement('div')
  host.id = HOST_ID
  host.setAttribute('data-blogit-reader', '')
  host.style.cssText = HOST_STYLE

  const shadow = host.attachShadow({ mode: 'open' })
  const css = `:host { display: block; height: 100%; }\n${radixCss}\n${readerCss}`

  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    shadow.adoptedStyleSheets = [sheet]
  } catch {
    const style = document.createElement('style')
    style.textContent = css
    shadow.appendChild(style)
  }

  document.documentElement.appendChild(host)

  const root = createRoot(shadow)
  let closed = false

  const close = () => {
    if (closed) return
    closed = true

    root.unmount()
    host.remove()

    rootElement.style.overflow = previousOverflow
    rootElement.style.overscrollBehavior = previousOverscroll
    if (pageBody) pageBody.inert = bodyWasInert
    window.scrollTo(scrollX, scrollY)
    previousActive?.focus({ preventScroll: true })
    activeReader = null
  }

  root.render(<ContentApp initialSettings={initialSettings} onClose={close} />)
  activeReader = { close }
}

async function toggleReader() {
  if (activeReader) {
    activeReader.close()
    return
  }
  if (opening) return

  opening = true
  try {
    const settings = await getSettings()
    openReader(settings)
  } finally {
    opening = false
  }
}

function init() {
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse: (response: MessageResponse) => void) => {
      if (message?.type === 'BLOGIT_PING') {
        sendResponse({ ok: true })
        return false
      }

      if (message?.type === 'BLOGIT_TOGGLE') {
        if (activeReader) {
          activeReader.close()
          sendResponse({ ok: true })
          return false
        }

        void toggleReader()
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false, reason: 'Could not start reader mode' }))
        return true
      }

      return false
    },
  )

  // If the page is restored from the back/forward cache, drop any stale overlay.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && activeReader) activeReader.close()
  })
}

const globalWindow = window as Window & { __blogitInjected?: boolean }
if (!globalWindow.__blogitInjected) {
  globalWindow.__blogitInjected = true
  init()
}
