import { Readability } from '@mozilla/readability'
import { getDomain } from './storage'
import { getLeadImage, sanitizeArticleHtml } from './sanitize'
import type { ArticleData } from './types'
import { htmlToMarkdown } from './markdown'

const WORDS_MIN = 40

function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

function stripSiteSuffix(title: string, siteName: string): string {
  const host = getDomain(window.location.href).toLowerCase()
  const suffixes = new Set(
    [siteName, host, host.replace(/^www\./, ''), host.split('.')[0]]
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 2),
  )

  for (const separator of [' — ', ' | ', ' – ', ' - ', ' · ', ' :: ']) {
    const index = title.lastIndexOf(separator)
    if (index < 12) continue

    const tail = title.slice(index + separator.length).trim().toLowerCase()
    if (!tail) continue

    const matchesSite = [...suffixes].some(
      (suffix) => tail === suffix || (tail.length > 3 && suffix.includes(tail)),
    )
    if (!matchesSite) continue

    const head = title.slice(0, index).trim()
    if (head.split(/\s+/).length >= 3) return head
  }

  return title
}

interface LeadImage {
  src: string
  alt: string
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/**
 * Readability often drops a hero image that sits just outside the article
 * body it selects. When the extracted content has no images at all, salvage
 * the page's most prominent article image so diagrams and cover art survive.
 */
function findLeadImage(doc: Document): LeadImage | null {
  const scope = doc.querySelector('article, main, [role="main"]') ?? doc.body
  if (!scope) return null

  const images = Array.from(scope.querySelectorAll('img'))

  for (const img of images) {
    const src = img.getAttribute('src')?.trim() ?? ''
    if (!src || src.startsWith('data:')) continue
    if (img.closest('header, nav, footer, aside, form')) continue

    const width = Number(img.getAttribute('width')) || img.naturalWidth || 0
    if (width > 0 && width < 400) continue

    const context = `${img.className} ${img.parentElement?.className ?? ''}`
    if (/\b(avatar|logo|icon|emoji|badge|sprite)\b/i.test(context)) continue

    const alt = img.getAttribute('alt')?.trim() ?? ''
    if (alt && /\b(avatar|logo|icon)\b/i.test(alt)) continue

    return { src, alt }
  }

  return null
}

/**
 * Runs Readability against a clone of the page so the live DOM is left untouched.
 */
export function extractArticle(): ArticleData {
  const cloned = document.cloneNode(true) as Document
  const parsed = new Readability(cloned, {
    charThreshold: 250,
    keepClasses: false,
    disableJSONLD: false,
  }).parse()

  if (!parsed || !parsed.content) {
    throw new Error(
      'BlogIt couldn’t find an article on this page. Try a story, essay, or blog post.',
    )
  }

  const textContent = clean(parsed.textContent)
  const words = textContent ? textContent.split(/\s+/).length : 0
  if (words < WORDS_MIN) {
    throw new Error(
      'There isn’t enough text here to read. Try an article, essay, or blog post.',
    )
  }

  const siteName = clean(parsed.siteName) || getDomain(window.location.href)
  const byline = clean(parsed.byline)
  const rawTitle = clean(parsed.title) || clean(document.title) || 'Untitled article'
  const title = stripSiteSuffix(rawTitle, siteName)

  let html = parsed.content
  if (!/<img\b/i.test(html)) {
    const lead = findLeadImage(document)
    if (lead) {
      html = `<figure><img src="${escapeAttribute(lead.src)}" alt="${escapeAttribute(
        lead.alt,
      )}"></figure>${html}`
    }
  }

  const content = sanitizeArticleHtml(html, window.location.href, { title, byline })
  const markdown = htmlToMarkdown(content)
  const excerpt = clean(parsed.excerpt)

  return {
    url: window.location.href,
    title,
    byline,
    siteName,
    excerpt:
      excerpt.length > 12
        ? excerpt
        : `${textContent.slice(0, 180).trim()}${textContent.length > 180 ? '…' : ''}`,
    content,
    markdown,
    textContent,
    lang: parsed.lang ?? document.documentElement.lang ?? undefined,
    publishedTime: parsed.publishedTime ?? undefined,
    image: getLeadImage(content),
  }
}
