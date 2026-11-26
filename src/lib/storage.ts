import type { ArticleData, SavedArticle, Settings, ThemeMode } from './types'

const SAVED_KEY = 'blogit:saved'
const SETTINGS_KEY = 'blogit:settings'
export const DEFAULT_FONT_SIZE = 18
export const MIN_FONT_SIZE = 15
export const MAX_FONT_SIZE = 24

const hasChromeStorage = () =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

function storageGet<T>(key: string, fallback: T): Promise<T> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve((result[key] as T | undefined) ?? fallback)
      })
    })
  }

  try {
    const raw = localStorage.getItem(key)
    return Promise.resolve(raw ? (JSON.parse(raw) as T) : fallback)
  } catch {
    return Promise.resolve(fallback)
  }
}

function storageSet(key: string, value: unknown): Promise<void> {
  if (hasChromeStorage()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve()
      })
    })
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('blogit:local-change', { detail: { key } }))
    return Promise.resolve()
  } catch {
    return Promise.resolve()
  }
}

function storageRemove(keys: string[]): Promise<void> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => resolve())
    })
  }

  keys.forEach((key) => localStorage.removeItem(key))
  window.dispatchEvent(new CustomEvent('blogit:local-change', { detail: { keys } }))
  return Promise.resolve()
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function articleId(url: string): string {
  let hash = 2166136261
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${(hash >>> 0).toString(36)}-${url.length.toString(36)}`
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

export function readingTimeFor(words: number): number {
  return Math.max(1, Math.ceil(words / 220))
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'the web'
  }
}

export async function getSavedArticles(): Promise<SavedArticle[]> {
  const saved = await storageGet<SavedArticle[]>(SAVED_KEY, [])
  return [...saved].sort((a, b) => b.savedAt - a.savedAt)
}

export async function getSavedArticle(id: string): Promise<SavedArticle | undefined> {
  const saved = await storageGet<SavedArticle[]>(SAVED_KEY, [])
  return saved.find((article) => article.id === id)
}

export async function isArticleSaved(url: string): Promise<boolean> {
  const id = articleId(url)
  const saved = await storageGet<SavedArticle[]>(SAVED_KEY, [])
  return saved.some((article) => article.id === id)
}

export async function saveArticle(
  article: ArticleData,
): Promise<{ article: SavedArticle; created: boolean }> {
  const id = articleId(article.url)
  const saved = await storageGet<SavedArticle[]>(SAVED_KEY, [])
  const existing = saved.find((item) => item.id === id)
  const wordCount = countWords(article.textContent)
  const entry: SavedArticle = {
    id,
    url: article.url,
    title: article.title,
    byline: article.byline,
    siteName: article.siteName,
    excerpt: article.excerpt,
    image: article.image,
    content: article.content,
    markdown: article.markdown,
    savedAt: Date.now(),
    wordCount,
    readingTime: readingTimeFor(wordCount),
    lang: article.lang,
    publishedTime: article.publishedTime,
  }

  const next = existing
    ? saved.map((item) => (item.id === id ? entry : item))
    : [entry, ...saved]

  await storageSet(SAVED_KEY, next)
  return { article: entry, created: !existing }
}

export async function removeSavedArticle(id: string): Promise<void> {
  const saved = await storageGet<SavedArticle[]>(SAVED_KEY, [])
  await storageSet(
    SAVED_KEY,
    saved.filter((article) => article.id !== id),
  )
}

export async function clearSavedArticles(): Promise<void> {
  await storageRemove([SAVED_KEY])
}

function systemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export async function getSettings(): Promise<Settings> {
  const stored = await storageGet<Partial<Settings>>(SETTINGS_KEY, {})
  const theme: ThemeMode =
    stored.theme === 'light' || stored.theme === 'dark' ? stored.theme : systemTheme()
  const fontSize = clamp(
    Number(stored.fontSize) || DEFAULT_FONT_SIZE,
    MIN_FONT_SIZE,
    MAX_FONT_SIZE,
  )
  return { theme, fontSize }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = {
    theme: patch.theme ?? current.theme,
    fontSize: clamp(patch.fontSize ?? current.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
  }
  await storageSet(SETTINGS_KEY, next)
  return next
}

type StorageListener = (payload: { saved?: SavedArticle[]; settings?: Settings }) => void

export function subscribeToStorage(listener: StorageListener): () => void {
  if (hasChromeStorage()) {
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return
      const payload: { saved?: SavedArticle[]; settings?: Settings } = {}
      if (changes[SAVED_KEY]) payload.saved = (changes[SAVED_KEY].newValue as SavedArticle[]) ?? []
      if (changes[SETTINGS_KEY]) payload.settings = changes[SETTINGS_KEY].newValue as Settings
      if (payload.saved || payload.settings) listener(payload)
    }
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }

  const handler = async () => {
    listener({
      saved: await getSavedArticles(),
      settings: await getSettings(),
    })
  }
  window.addEventListener('blogit:local-change', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('blogit:local-change', handler)
    window.removeEventListener('storage', handler)
  }
}

export function formatSavedDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (dayDiff <= 0) return 'Today'
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return `${dayDiff} days ago`

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date)
}

export function formatPublishedDate(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
