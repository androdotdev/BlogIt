import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button, IconButton, Theme } from '@radix-ui/themes'
import DOMPurify from 'dompurify'
import { htmlToMarkdown } from '../lib/markdown'
import { marked } from 'marked'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  countWords,
  formatPublishedDate,
  readingTimeFor,
} from '../lib/storage'
import type { ArticleData, ReaderContext, SavedArticle, ThemeMode } from '../lib/types'
import {
  ArrowUpRightIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  CheckIcon,
  InfoIcon,
  LogoMark,
  MinusIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  XIcon,
} from './icons'

interface ReaderViewProps {
  article: ArticleData | SavedArticle
  context: ReaderContext
  theme: ThemeMode
  fontSize: number
  saved: boolean
  savedAt?: number
  onThemeChange: () => void
  onFontSizeChange: (size: number) => void
  onToggleSave: () => Promise<string>
  onClose: () => void
}

function formatFullDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function ReaderView({
  article,
  context,
  theme,
  fontSize,
  saved,
  savedAt,
  onThemeChange,
  onFontSizeChange,
  onToggleSave,
  onClose,
}: ReaderViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const content = useMemo(() => {
    const markdown = article.markdown ?? htmlToMarkdown(article.content)
    const html = marked.parse(markdown, { async: false })
    return DOMPurify.sanitize(html)
  }, [article.content, article.markdown])

  const wordCount = useMemo(() => {
    if ('wordCount' in article) return article.wordCount
    return countWords(article.textContent)
  }, [article])
  const readingTime = 'readingTime' in article ? article.readingTime : readingTimeFor(wordCount)
  const published = formatPublishedDate(article.publishedTime)
  const initial = article.byline.trim().charAt(0).toUpperCase()

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const message = await onToggleSave()
      showToast(message)
    } catch {
      showToast('Could not update your library')
    } finally {
      setSaving(false)
    }
  }, [onToggleSave, saving, showToast])

  const handleScroll = useCallback(() => {
    const node = scrollRef.current
    if (!node) return
    const max = node.scrollHeight - node.clientHeight
    const next = max > 0 ? Math.min(1, Math.max(0, node.scrollTop / max)) : 0
    setProgress(next)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    if (context === 'overlay') scrollRef.current?.focus({ preventScroll: true })
    const frame = requestAnimationFrame(handleScroll)
    return () => cancelAnimationFrame(frame)
  }, [article.url, context, handleScroll])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [handleSave, onClose])

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const canDecrease = fontSize > MIN_FONT_SIZE
  const canIncrease = fontSize < MAX_FONT_SIZE

  return (
    <Theme
      ref={scrollRef}
      appearance={theme}
      accentColor="orange"
      grayColor="sand"
      radius="large"
      scaling="100%"
      hasBackground={false}
      className={`blogit-theme blogit-reader-shell${context === 'overlay' ? ' is-overlay' : ''}`}
      data-appearance={theme}
      style={{ '--reader-font-size': `${fontSize}px` } as CSSProperties}
      onScroll={handleScroll}
      tabIndex={context === 'overlay' ? -1 : undefined}
      role={context === 'overlay' ? 'dialog' : 'main'}
      aria-modal={context === 'overlay' ? true : undefined}
      aria-label={context === 'overlay' ? 'BlogIt reader mode' : undefined}
    >
      <header className="reader-topbar">
        <div className="reader-topbar-inner">
          <div className="reader-brand">
            <LogoMark size={27} />
            <span className="reader-brand-name">BlogIt</span>
            <span className="reader-brand-rule" aria-hidden="true" />
            <span className="reader-brand-context">Reader</span>
          </div>

          <div className="reader-actions">
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              radius="full"
              className="reader-tool"
              title="Smaller text"
              aria-label="Decrease text size"
              disabled={!canDecrease}
              onClick={() => onFontSizeChange(fontSize - 1)}
            >
              <MinusIcon size={17} />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              radius="full"
              className="reader-tool"
              title="Larger text"
              aria-label="Increase text size"
              disabled={!canIncrease}
              onClick={() => onFontSizeChange(fontSize + 1)}
            >
              <PlusIcon size={17} />
            </IconButton>

            <span className="reader-action-rule" aria-hidden="true" />

            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              radius="full"
              className="reader-tool"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={onThemeChange}
            >
              {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              radius="full"
              className={`reader-tool reader-save-tool${saved ? ' is-saved' : ''}`}
              title={saved ? 'Remove from library' : 'Save to library (⌘/Ctrl + S)'}
              aria-label={saved ? 'Remove from library' : 'Save article to library'}
              aria-pressed={saved}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saved ? <BookmarkFilledIcon size={18} /> : <BookmarkIcon size={18} />}
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              radius="full"
              className="reader-tool reader-close-tool"
              title="Close reader (Esc)"
              aria-label="Close reader"
              onClick={onClose}
            >
              <XIcon size={18} />
            </IconButton>
          </div>
        </div>
        <div className="reader-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>

      <main className="reader-main">
        <article className="reader-article" lang={article.lang}>
          <div className="reader-kicker">
            <span className="reader-kicker-dot" aria-hidden="true" />
            {article.siteName}
          </div>

          <h1 className="reader-title">{article.title}</h1>

          {article.excerpt ? <p className="reader-deck">{article.excerpt}</p> : null}

          <div className="reader-meta">
            {article.byline ? (
              <span className="reader-author">
                <span className="reader-author-mark" aria-hidden="true">
                  {initial || 'B'}
                </span>
                {article.byline}
              </span>
            ) : null}
            {published ? (
              <>
                {article.byline ? <span className="reader-meta-dot" aria-hidden="true" /> : null}
                <time dateTime={article.publishedTime}>{published}</time>
              </>
            ) : null}
            <span className="reader-meta-dot" aria-hidden="true" />
            <span>{readingTime} min read</span>
            <span className="reader-meta-dot" aria-hidden="true" />
            <span>{wordCount.toLocaleString()} words</span>
          </div>

          <div className="reader-divider" aria-hidden="true">
            <span />
            <i>◆</i>
            <span />
          </div>

          <div className="reader-content" dangerouslySetInnerHTML={{ __html: content }} />

          <footer className="reader-end">
            <div className="reader-end-mark" aria-hidden="true">
              <span />
              <LogoMark size={22} />
              <span />
            </div>
            <p className="reader-end-title">End of article</p>
            <a className="reader-end-link" href={article.url} target="_blank" rel="noopener noreferrer">
              Read on {article.siteName}
              <ArrowUpRightIcon size={15} />
            </a>
            {context === 'page' && savedAt ? (
              <p className="reader-end-saved">Saved to BlogIt on {formatFullDate(savedAt)}</p>
            ) : null}
          </footer>
        </article>
      </main>

      <div className={`reader-toast${toast ? ' is-visible' : ''}`} role="status" aria-live="polite">
        <CheckIcon size={16} />
        <span>{toast ?? ''}</span>
      </div>
    </Theme>
  )
}

interface ReaderStateProps {
  theme: ThemeMode
  variant: 'loading' | 'error' | 'missing'
  title?: string
  message?: string
  onClose?: () => void
  onRetry?: () => void
}

export function ReaderState({ theme, variant, title, message, onClose, onRetry }: ReaderStateProps) {
  useEffect(() => {
    if (!onClose) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [onClose])

  return (
    <Theme
      appearance={theme}
      accentColor="orange"
      grayColor="sand"
      radius="large"
      scaling="100%"
      hasBackground={false}
      className="blogit-theme blogit-reader-shell blogit-reader-state"
      data-appearance={theme}
      role="dialog"
      aria-modal="true"
      aria-label="BlogIt reader mode"
    >
      <div className="reader-state-card">
        {variant === 'loading' ? (
          <>
            <div className="reader-loader">
              <LogoMark size={46} />
              <span className="reader-loader-ring" aria-hidden="true" />
            </div>
            <p className="reader-state-title">{title ?? 'Preparing your reading view'}</p>
            <p className="reader-state-message">{message ?? 'Finding the story…'}</p>
          </>
        ) : (
          <>
            <div className="reader-state-icon">
              <InfoIcon size={24} />
            </div>
            <p className="reader-state-title">{title ?? (variant === 'missing' ? 'Article not found' : 'No article here')}</p>
            <p className="reader-state-message">{message}</p>
            <div className="reader-state-actions">
              {onRetry ? (
                <Button size="2" variant="soft" onClick={onRetry}>
                  Try again
                </Button>
              ) : null}
              {onClose ? (
                <Button size="2" variant="solid" onClick={onClose}>
                  Close
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Theme>
  )
}
