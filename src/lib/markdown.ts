import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'collapsed',
})

/** Converts sanitized article HTML into clean Markdown text so the reader
 *  can render it with a lightweight Markdown parser instead of raw innerHTML.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  return turndown.turndown(html).trim()
}
