'use client'

import { marked } from 'marked'
import TurndownService from 'turndown'
import type { DocStyles } from './types'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
})

// Don't escape underscores in code etc.
turndown.remove('style')
turndown.remove('script')

/** Build a full standalone HTML document string for export. */
function buildStandaloneHtml(opts: {
  title: string
  bodyHtml: string
  styles?: DocStyles
}): string {
  const { title, bodyHtml, styles } = opts
  const fontFamily =
    styles?.fontFamily ??
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  const fontSize = styles?.fontSize ?? '16px'
  const lineHeight = styles?.lineHeight ?? '1.7'
  const color = styles?.color ?? '#1a1a1a'
  const maxWidth = styles?.maxWidth ?? '820px'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: ${lineHeight};
    color: ${color};
    margin: 0;
    padding: 2.5rem 1.5rem;
    background: #fff;
  }
  .doc-container { max-width: ${maxWidth}; margin: 0 auto; }
  h1 { font-size: 2rem; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 1.5rem; margin: 1.25rem 0 0.5rem; }
  h3 { font-size: 1.25rem; margin: 1rem 0 0.5rem; }
  p { margin: 0 0 0.75rem; }
  ul, ol { margin: 0.5rem 0 0.75rem 1.5rem; }
  li { margin: 0.25rem 0; }
  blockquote {
    border-left: 3px solid #ccc;
    padding: 0.25rem 1rem;
    margin: 0.75rem 0;
    color: #555;
    font-style: italic;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
    background: #f4f4f4;
    padding: 0.1em 0.35em;
    border-radius: 0.25rem;
  }
  pre {
    background: #f4f4f4;
    padding: 0.85rem 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
  }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
  th, td { border: 1px solid #ccc; padding: 0.4rem 0.65rem; text-align: left; }
  th { background: #f4f4f4; font-weight: 600; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.25rem 0; }
  .docmate-ai-insert { border-left: 2px solid #e0e0e0; padding-left: 0.75rem; margin: 0.5rem 0 1rem; }
  .docmate-ai-insert::before { display: none; }
</style>
</head>
<body>
<div class="doc-container">
<h1>${escapeHtml(title)}</h1>
${bodyHtml}
</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function safeFilename(title: string, ext: string): string {
  const base = (title || 'untitled').trim().replace(/[^\w\s-]/g, '')
  const clean = base.replace(/\s+/g, '-').toLowerCase().slice(0, 80) || 'untitled'
  return `${clean}.${ext}`
}

/**
 * Export as Word .doc (HTML-flavoured). Word and most office suites open
 * this format natively — the file is HTML with an MS Office namespace and
 * a .doc extension, which Word treats as a native document. This avoids
 * any server-side dependency and works entirely in the browser.
 *
 * If you want true .docx (OOXML zip), swap this for a server-side approach
 * using the `docx` npm package.
 */
export function exportAsDocx(opts: {
  title: string
  bodyHtml: string
  styles?: DocStyles
}): void {
  // Strip the outer .doc-container wrapper so Word sees clean content
  const inner = `<h1>${escapeHtml(opts.title)}</h1>${opts.bodyHtml || ''}`
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument>
</xml>
<![endif]-->
<style>
@page WordSection1 { size: 8.5in 11.0in; margin: 1in 1in 1in 1in; }
div.WordSection1 { page: WordSection1; }
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
h1 { font-size: 22pt; margin: 0 0 12pt; }
h2 { font-size: 16pt; margin: 18pt 0 6pt; }
h3 { font-size: 13pt; margin: 14pt 0 4pt; }
p { margin: 0 0 8pt; }
ul, ol { margin: 4pt 0 8pt 24pt; }
li { margin: 2pt 0; }
blockquote { border-left: 3pt solid #999; padding: 2pt 10pt; margin: 8pt 0; color: #555; font-style: italic; }
code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f0f0f0; padding: 1pt 3pt; }
pre { background: #f0f0f0; padding: 8pt 10pt; margin: 8pt 0; font-family: 'Courier New', monospace; font-size: 10pt; }
pre code { background: transparent; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
th, td { border: 1pt solid #999; padding: 4pt 6pt; text-align: left; }
th { background: #f0f0f0; font-weight: bold; }
hr { border: none; border-top: 1pt solid #999; margin: 12pt 0; }
.docmate-ai-insert { border-left: 2pt solid #ddd; padding-left: 8pt; margin: 4pt 0 10pt; }
.docmate-ai-insert::before { display: none; }
</style>
</head>
<body>
<div class="WordSection1">
${inner}
</div>
</body>
</html>`
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  triggerDownload(blob, safeFilename(opts.title, 'doc'))
}

/** Export as standalone .html file. */
export function exportAsHtml(opts: {
  title: string
  bodyHtml: string
  styles?: DocStyles
}): void {
  const html = buildStandaloneHtml(opts)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  triggerDownload(blob, safeFilename(opts.title, 'html'))
}

/** Export as Markdown (.md) — converts doc HTML → MD via turndown. */
export function exportAsMarkdown(opts: {
  title: string
  bodyHtml: string
}): void {
  let md = `# ${opts.title}\n\n`
  if (opts.bodyHtml.trim()) {
    md += turndown.turndown(opts.bodyHtml)
  }
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  triggerDownload(blob, safeFilename(opts.title, 'md'))
}

/** Export as plain text (.txt). */
export function exportAsText(opts: { title: string; bodyText: string }): void {
  const text = `${opts.title}\n${'='.repeat(Math.min(80, opts.title.length || 1))}\n\n${opts.bodyText}\n`
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, safeFilename(opts.title, 'txt'))
}

/**
 * Export as PDF via the browser's print dialog.
 * Opens a fresh window with a print-styled HTML doc and triggers print.
 * User picks "Save as PDF" as the destination.
 */
export function exportAsPdf(opts: {
  title: string
  bodyHtml: string
  styles?: DocStyles
}): void {
  const html = buildStandaloneHtml(opts)
  const win = window.open('', '_blank', 'width=900,height=1200')
  if (!win) {
    alert('Please allow pop-ups to export as PDF.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  // Give the new doc a moment to lay out before printing
  win.focus()
  setTimeout(() => {
    win.print()
  }, 400)
}

/** Reverse direction: parse markdown into doc HTML (used for .md import). */
export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string
}
