import DOMPurify from 'dompurify'

const FORBIDDEN_TAGS = [
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  'noscript',
  'video',
  'audio',
  'source',
]

function resolveUrl(value: string | null, baseUrl: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const resolved = new URL(trimmed, baseUrl)
    if (!['http:', 'https:', 'data:', 'mailto:'].includes(resolved.protocol)) return null
    if (resolved.protocol === 'data:' && !resolved.href.startsWith('data:image/')) return null
    return resolved.href
  } catch {
    return null
  }
}

function pickImageSource(image: Element): string | null {
  const candidates = [
    image.getAttribute('data-src'),
    image.getAttribute('data-lazy-src'),
    image.getAttribute('data-original'),
    image.getAttribute('data-url'),
    image.getAttribute('src'),
  ]

  const srcset = image.getAttribute('srcset') || image.getAttribute('data-srcset')
  if (srcset) {
    const entries = srcset
      .split(',')
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter(Boolean)
    const current = candidates.find(Boolean)
    const looksLikePlaceholder =
      !current || current.startsWith('data:image/gif') || current.startsWith('data:image/svg')
    if (looksLikePlaceholder && entries.length > 0) {
      candidates.unshift(entries[entries.length - 1])
    }
  }

  return candidates.find((value): value is string => Boolean(value)) ?? null
}

/**
 * Cleans Readability output so it is safe to render with dangerouslySetInnerHTML.
 * Relative URLs are resolved against the original page, lazy-loaded images are
 * restored, tracking pixels are dropped, and inline styles/scripts are removed.
 */
export interface SanitizeArticleOptions {
  title?: string
  byline?: string
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Readability wraps output in #readability-page-1; flatten it so our CSS can
 *  target direct children (drop caps, spacing) without an extra wrapper. */
function unwrapReadabilityPage(body: HTMLElement) {
  const wrapper = body.querySelector('#readability-page-1')
  if (!wrapper || !wrapper.parentElement) return
  const parent = wrapper.parentElement
  while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper)
  wrapper.remove()
}

/** Removes bare top-level <div>/<article> shells so the article's own blocks
 *  become direct children of the content container. */
function flattenTopLevelContainers(body: HTMLElement) {
  for (let pass = 0; pass < 4; pass += 1) {
    const node = body.firstElementChild
    if (!node) return
    if (!['div', 'article', 'main', 'section'].includes(node.tagName.toLowerCase())) return
    while (node.firstChild) body.insertBefore(node.firstChild, node)
    node.remove()
  }
}

function stripTrailingArticleNoise(body: HTMLElement) {
  for (let pass = 0; pass < 3; pass += 1) {
    const node = body.lastElementChild
    if (!node) return
    const tag = node.tagName.toLowerCase()
    if (['figure', 'picture', 'img', 'video', 'audio'].includes(tag)) return
    if (node.querySelector('img, picture, figure, video, audio')) return

    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!text) {
      node.remove()
      continue
    }
    if (text.length > 320) return

    const isBoilerplate =
      /\b(we use cookies|this (web)?site uses cookies|accept all|cookie (policy|settings)|subscribe to (our|the) newsletter|sign up for|all rights reserved|advertisement|share this (article|story)|follow us on|comments?)\b/i.test(
        text,
      )
    if (!isBoilerplate) return
    node.remove()
  }
}

/** Drops a repeated kicker / byline / date block that Readability pulled into
 *  the article body. Only looks at the very beginning and stops at real prose. */
function stripLeadingArticleNoise(body: HTMLElement, options: SanitizeArticleOptions) {
  const title = normalizeText(options.title ?? '')
  const byline = normalizeText(options.byline ?? '')
  let removed = 0

  while (removed < 4) {
    const node = body.firstElementChild
    if (!node) return
    const tag = node.tagName.toLowerCase()

    if (['figure', 'picture', 'img', 'video', 'audio'].includes(tag)) return
    if (node.querySelector('img, picture, figure, video, audio')) return

    const raw = node.textContent ?? ''
    const text = raw.replace(/\s+/g, ' ').trim()
    if (!text) {
      node.remove()
      continue
    }

    const normalized = normalizeText(text)

    if (
      tag === 'h1' &&
      title &&
      (normalized === title || title.includes(normalized) || normalized.includes(title))
    ) {
      node.remove()
      removed += 1
      continue
    }

    const isByline = byline.length > 2 && normalized.includes(byline)
    const isMeta =
      /^(by|written by|words by|photos? by|illustrations? by|published|updated)\b/.test(normalized) ||
      /\b\d+\s*min(ute)?s?\s+read\b/.test(normalized) ||
      (/\b(19|20)\d{2}\b/.test(text) && text.length < 90)
    const looksLikeLabel = text.length < 70 && !/[.!?]$/.test(text)
    const isHeading = /^h[2-6]$/.test(tag)

    if (isByline || isMeta || (!isHeading && looksLikeLabel)) {
      node.remove()
      removed += 1
      continue
    }

    if (tag !== 'p' && tag !== 'blockquote' && text.length < 140) {
      node.remove()
      removed += 1
      continue
    }

    return
  }
}

export function sanitizeArticleHtml(
  html: string,
  baseUrl: string,
  options: SanitizeArticleOptions = {},
): string {
  if (!html) return ''
  if (typeof window === 'undefined') return html

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  unwrapReadabilityPage(doc.body)
  flattenTopLevelContainers(doc.body)

  doc.querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select, link, meta, noscript, source').forEach((node) => node.remove())

  doc.querySelectorAll('img').forEach((image) => {
    const source = resolveUrl(pickImageSource(image), baseUrl)
    const width = Number(image.getAttribute('width'))
    const height = Number(image.getAttribute('height'))
    const isTiny = (Number.isFinite(width) && width > 0 && width <= 2) || (Number.isFinite(height) && height > 0 && height <= 2)

    if (!source || isTiny) {
      image.remove()
      return
    }

    image.setAttribute('src', source)
    image.setAttribute('loading', 'lazy')
    image.setAttribute('decoding', 'async')
    image.setAttribute('referrerpolicy', 'no-referrer')
    if (!image.getAttribute('alt')) image.setAttribute('alt', '')
    image.removeAttribute('srcset')
    image.removeAttribute('sizes')
  })

  doc.querySelectorAll('a').forEach((link) => {
    const href = resolveUrl(link.getAttribute('href'), baseUrl)
    if (!href) {
      link.removeAttribute('href')
      return
    }
    link.setAttribute('href', href)
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  })

  doc.querySelectorAll('picture').forEach((picture) => {
    if (!picture.querySelector('img')) picture.remove()
  })

  stripLeadingArticleNoise(doc.body, options)
  stripTrailingArticleNoise(doc.body)

  return DOMPurify.sanitize(doc.body.innerHTML, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ['style', 'srcset', 'sizes'],
    ADD_ATTR: ['target', 'rel', 'loading', 'decoding', 'referrerpolicy'],
    ALLOW_DATA_ATTR: false,
  })
}

export function getLeadImage(html: string): string | undefined {
  if (!html || typeof window === 'undefined') return undefined
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const image = doc.querySelector('img[src]')
  const src = image?.getAttribute('src') ?? undefined
  if (!src) return undefined
  if (src.startsWith('data:') && src.length > 180_000) return undefined
  return src
}
