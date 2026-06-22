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

turndown.remove('style')
turndown.remove('script')

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
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function safeFilename(title: string, ext: string): string {
  const base = (title || 'untitled').trim().replace(/[^\w\s-]/g, '')
  const clean = base.replace(/\s+/g, '-').toLowerCase().slice(0, 80) || 'untitled'
  return `${clean}.${ext}`
}

/** Build a standalone HTML document string for export. */
function buildStandaloneHtml(opts: {
  title: string
  bodyHtml: string
  styles?: DocStyles
}): string {
  const { title, bodyHtml, styles } = opts
  const fontFamily =
    styles?.fontFamily ??
    "Calibri, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  const fontSize = styles?.fontSize ?? '11pt'
  const lineHeight = styles?.lineHeight ?? '1.5'
  const color = styles?.color ?? '#1a1a1a'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 1in; }
  body {
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: ${lineHeight};
    color: ${color};
    margin: 0;
    padding: 1in;
    background: #fff;
  }
  h1 { font-size: 22pt; font-weight: 700; margin: 18pt 0 6pt; }
  h2 { font-size: 16pt; font-weight: 700; margin: 14pt 0 4pt; }
  h3 { font-size: 13pt; font-weight: 700; margin: 12pt 0 3pt; }
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
  hr { border: none; border-top: 1pt solid #999; margin: 12pt 0; page-break-after: always; }
  img { max-width: 100%; }
  .docmate-ai-insert { border-left: 2pt solid #ddd; padding-left: 8pt; margin: 4pt 0 10pt; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${bodyHtml}
</body>
</html>`
}

/**
 * Export as true .docx using the `docx` package.
 * Parses the editor HTML and converts each element to docx Paragraphs/Tables.
 */
export async function exportAsDocx(opts: {
  title: string
  bodyHtml: string
}): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
    PageBreak } = await import('docx')

  // Parse the HTML body
  const parser = new DOMParser()
  const doc = parser.parseFromString(opts.bodyHtml, 'text/html')
  const body = doc.body

  const paragraphs: InstanceType<typeof Paragraph>[] = []
  const tables: InstanceType<typeof Table>[] = []

  // Helper: convert inline HTML to TextRun[]
  function inlineToRuns(el: Node): InstanceType<typeof TextRun>[] {
    const runs: InstanceType<typeof TextRun>[] = []
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || ''
        if (text) runs.push(new TextRun({ text }))
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const e = child as HTMLElement
        const tagName = e.tagName.toLowerCase()
        const text = e.textContent || ''
        if (tagName === 'strong' || tagName === 'b') {
          runs.push(new TextRun({ text, bold: true }))
        } else if (tagName === 'em' || tagName === 'i') {
          runs.push(new TextRun({ text, italics: true }))
        } else if (tagName === 'u') {
          runs.push(new TextRun({ text, underline: {} }))
        } else if (tagName === 's' || tagName === 'strike') {
          runs.push(new TextRun({ text, strike: true }))
        } else if (tagName === 'code') {
          runs.push(new TextRun({ text, font: 'Courier New' }))
        } else if (tagName === 'sub') {
          runs.push(new TextRun({ text, subScript: true }))
        } else if (tagName === 'sup') {
          runs.push(new TextRun({ text, superScript: true }))
        } else if (tagName === 'br') {
          runs.push(new TextRun({ break: 1 }))
        } else if (tagName === 'a') {
          runs.push(new TextRun({ text, style: 'Hyperlink' }))
        } else if (tagName === 'mark') {
          const color = e.getAttribute('data-color') || e.style.backgroundColor
          runs.push(new TextRun({ text, highlight: 'yellow' }))
        } else {
          // Unknown inline — recurse
          runs.push(...inlineToRuns(e))
        }
      }
    })
    return runs
  }

  // Helper: convert alignment style to docx AlignmentType
  function getAlignment(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const align = el.style.textAlign || el.getAttribute('data-text-align')
    if (align === 'center') return AlignmentType.CENTER
    if (align === 'right') return AlignmentType.RIGHT
    if (align === 'justify') return AlignmentType.JUSTIFIED
    return AlignmentType.LEFT
  }

  // Walk top-level block elements
  body.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (tag === 'h1') {
      paragraphs.push(new Paragraph({
        children: inlineToRuns(el),
        heading: HeadingLevel.HEADING_1,
        alignment: getAlignment(el),
      }))
    } else if (tag === 'h2') {
      paragraphs.push(new Paragraph({
        children: inlineToRuns(el),
        heading: HeadingLevel.HEADING_2,
        alignment: getAlignment(el),
      }))
    } else if (tag === 'h3') {
      paragraphs.push(new Paragraph({
        children: inlineToRuns(el),
        heading: HeadingLevel.HEADING_3,
        alignment: getAlignment(el),
      }))
    } else if (tag === 'p') {
      const runs = inlineToRuns(el)
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({
          children: runs,
          alignment: getAlignment(el),
        }))
      } else {
        paragraphs.push(new Paragraph({ children: [] }))
      }
    } else if (tag === 'ul' || tag === 'ol') {
      el.querySelectorAll(':scope > li').forEach((li, i) => {
        paragraphs.push(new Paragraph({
          children: inlineToRuns(li),
          bullet: tag === 'ul' ? { level: 0 } : undefined,
          numbering: tag === 'ol' ? { reference: 'default-numbering', level: 0 } : undefined,
        }))
      })
    } else if (tag === 'blockquote') {
      paragraphs.push(new Paragraph({
        children: inlineToRuns(el),
        indent: { left: 720 },
        spacing: { before: 120, after: 120 },
      }))
    } else if (tag === 'pre') {
      const code = el.textContent || ''
      code.split('\n').forEach((line) => {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line, font: 'Courier New' })],
          spacing: { after: 0 },
        }))
      })
    } else if (tag === 'hr') {
      // Page break
      paragraphs.push(new Paragraph({
        children: [new PageBreak()],
      }))
    } else if (tag === 'table') {
      const rows: InstanceType<typeof TableRow>[] = []
      el.querySelectorAll('tr').forEach((tr) => {
        const cells: InstanceType<typeof TableCell>[] = []
        tr.querySelectorAll('th, td').forEach((cell) => {
          const isHeader = cell.tagName.toLowerCase() === 'th'
          cells.push(new TableCell({
            children: [new Paragraph({
              children: inlineToRuns(cell),
              alignment: getAlignment(cell as HTMLElement),
            })],
            shading: isHeader ? { fill: 'F0F0F0' } : undefined,
          }))
        })
        rows.push(new TableRow({ children: cells }))
      })
      if (rows.length > 0) {
        tables.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        }))
      }
    } else if (tag === 'img') {
      const src = el.getAttribute('src') || ''
      if (src.startsWith('data:image/')) {
        // Decode base64 to binary
        const base64 = src.split(',')[1]
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const type = src.match(/data:(image\/\w+);/)?.[1] || 'image/png'
        paragraphs.push(new Paragraph({
          children: [new ImageRun({
            data: bytes,
            transformation: { width: 500, height: 300 },
            type: type as 'png' | 'jpg' | 'gif' | 'bmp' | 'svg',
          })],
        }))
      }
    } else if (tag === 'div' && el.classList.contains('docmate-ai-insert')) {
      // Recurse into AI-insert blocks — just treat as content
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          // Re-process as if top-level
          body.appendChild(child.cloneNode(true))
        }
      })
    } else {
      // Unknown block — try to convert
      const runs = inlineToRuns(el)
      if (runs.length > 0) {
        paragraphs.push(new Paragraph({ children: runs }))
      }
    }
  })

  const document = new Document({
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
      }],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: opts.title, bold: true, size: 44 })],
          spacing: { after: 240 },
        }),
        ...paragraphs,
        ...tables,
      ],
    }],
  })

  const blob = await Packer.toBlob(document)
  triggerDownload(blob, safeFilename(opts.title, 'docx'))
}

/** Export as Word .doc (HTML-flavoured, for older Word versions). */
export function exportAsDoc(opts: {
  title: string
  bodyHtml: string
}): void {
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

/** Export as Markdown (.md). */
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

/** Export as PDF via the browser's print dialog. */
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
  win.focus()
  setTimeout(() => {
    win.print()
  }, 400)
}

/**
 * Import a .docx file and convert it to HTML using mammoth.
 * Returns the HTML string (to be loaded into the editor) + the document title.
 */
export async function importFromDocx(file: File): Promise<{ html: string; title: string }> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const title = file.name.replace(/\.docx?$/i, '')
  return { html: result.value, title }
}

/** Reverse direction: parse markdown into doc HTML. */
export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string
}
