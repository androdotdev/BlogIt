import { useCallback, useEffect, useState } from 'react'
import { ReaderState, ReaderView } from '../components/ReaderView'
import {
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  clamp,
  getSavedArticle,
  getSettings,
  removeSavedArticle,
  saveArticle,
  saveSettings,
  subscribeToStorage,
} from '../lib/storage'
import { htmlToMarkdown } from '../lib/markdown'
import type { ArticleData, SavedArticle, Settings } from '../lib/types'

function closeTab() {
  if (typeof chrome !== 'undefined' && chrome.tabs?.getCurrent) {
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id !== undefined) chrome.tabs.remove(tab.id)
      else window.close()
    })
  } else {
    window.close()
  }
}

function toArticleData(article: SavedArticle): ArticleData {
  const parsed = new DOMParser().parseFromString(article.content, 'text/html')
  const markdown = htmlToMarkdown(article.content)
  return {
    url: article.url,
    title: article.title,
    byline: article.byline,
    siteName: article.siteName,
    excerpt: article.excerpt,
    content: article.content,
    markdown,
    textContent: parsed.body.textContent ?? '',
    lang: article.lang,
    publishedTime: article.publishedTime,
    image: article.image,
  }
}

export function ReaderPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [article, setArticle] = useState<SavedArticle | null>(null)
  const [settings, setSettings] = useState<Settings>({ theme: 'light', fontSize: 18 })
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    let cancelled = false
    const id = new URLSearchParams(window.location.search).get('id')

    Promise.all([getSettings(), id ? getSavedArticle(id) : Promise.resolve(undefined)])
      .then(([loadedSettings, loadedArticle]) => {
        if (cancelled) return
        setSettings(loadedSettings)
        if (loadedArticle) {
          setArticle(loadedArticle)
          setSaved(true)
          setStatus('ready')
        } else {
          setStatus('missing')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('missing')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.colorScheme = settings.theme
    document.body.style.background = settings.theme === 'dark' ? '#15130f' : '#f2ede2'
  }, [settings.theme])

  useEffect(() => {
    if (article) document.title = `${article.title} — BlogIt`
  }, [article])

  useEffect(() => {
    if (!article) return
    return subscribeToStorage((payload) => {
      if (payload.settings) {
        setSettings({
          theme: payload.settings.theme,
          fontSize: clamp(payload.settings.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
        })
      }
      if (payload.saved) {
        const exists = payload.saved.some((item) => item.id === article.id)
        setSaved(exists)
        const fresh = payload.saved.find((item) => item.id === article.id)
        if (fresh) setArticle(fresh)
      }
    })
  }, [article])

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

  const toggleSave = useCallback(async (): Promise<string> => {
    if (!article) return 'Nothing to save'
    if (saved) {
      await removeSavedArticle(article.id)
      setSaved(false)
      return 'Removed from your library'
    }

    await saveArticle(toArticleData(article))
    setSaved(true)
    return 'Saved to your library'
  }, [article, saved])

  if (status === 'loading') {
    return (
      <ReaderState
        theme={settings.theme}
        variant="loading"
        title="Opening your library"
        message="Fetching the saved article…"
      />
    )
  }

  if (status === 'missing' || !article) {
    return (
      <ReaderState
        theme={settings.theme}
        variant="missing"
        title="Article not found"
        message="This article isn’t in your BlogIt library anymore. It may have been removed from this browser."
        onClose={closeTab}
      />
    )
  }

  return (
    <ReaderView
      article={article}
      context="page"
      theme={settings.theme}
      fontSize={settings.fontSize}
      saved={saved}
      savedAt={article.savedAt}
      onThemeChange={changeTheme}
      onFontSizeChange={changeFontSize}
      onToggleSave={toggleSave}
      onClose={closeTab}
    />
  )
}
