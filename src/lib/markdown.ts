import { marked } from 'marked'

// Configure marked once: GFM, line breaks, sanitize via post-processing
marked.setOptions({
  gfm: true,
  breaks: true,
})

/**
 * Convert markdown to safe HTML for insertion into a contentEditable doc.
 * We render with marked, then strip <script>/<style>/<iframe> and event handlers.
 */
export function markdownToDocHtml(md: string): string {
  if (!md.trim()) return ''
  const raw = marked.parse(md, { async: false }) as string
  return sanitizeDocHtml(raw)
}

const DANGEROUS_TAGS = /<(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|svg)\b[^>]*>[\s\S]*?<\/\1>/gi
const DANGEROUS_TAGS_SELF = /<(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|svg)\b[^>]*\/?>/gi
const ON_ATTR = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const HREF_JS = /(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi

export function sanitizeDocHtml(html: string): string {
  let out = html
  out = out.replace(DANGEROUS_TAGS, '')
  out = out.replace(DANGEROUS_TAGS_SELF, '')
  out = out.replace(ON_ATTR, '')
  out = out.replace(HREF_JS, '')
  return out
}

/** Wrap a chunk of HTML in a divider we can style as an AI insert */
export function wrapAiInsert(html: string): string {
  return `<section class="docmate-ai-insert" data-source="ai">${html}</section>`
}

/** Tiny id generator (crypto-safe-ish for client use) */
export function newId(prefix = 'm'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rnd}`
}
