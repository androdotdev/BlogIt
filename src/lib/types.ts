export type ThemeMode = 'light' | 'dark'

export interface ArticleData {
  url: string
  title: string
  byline: string
  siteName: string
  excerpt: string
  content: string
  markdown: string
  textContent: string
  lang?: string
  publishedTime?: string
  image?: string
}

export interface SavedArticle {
  id: string
  url: string
  title: string
  byline: string
  siteName: string
  excerpt: string
  image?: string
  content: string
  markdown: string
  savedAt: number
  wordCount: number
  readingTime: number
  lang?: string
  publishedTime?: string
}

export interface Settings {
  theme: ThemeMode
  fontSize: number
}

export type ReaderContext = 'overlay' | 'page'

export type ExtensionMessage =
  | { type: 'BLOGIT_TOGGLE' }
  | { type: 'BLOGIT_PING' }

export interface MessageResponse {
  ok: boolean
  reason?: string
}
