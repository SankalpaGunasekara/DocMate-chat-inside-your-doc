// Set doc content for testing
(() => {
  const s = window.__docmateStore
  if (!s) return 'no store'

  const html = [
    '<h1>DocMate Feature Demo</h1>',
    '<p>This is a <strong>test document</strong> for verifying the new <em>export</em> and <em>selection-edit</em> features.</p>',
    '<h2>Export formats</h2>',
    '<ul>',
    '<li>Word (.doc) — opens in MS Word</li>',
    '<li>PDF — via the browser print dialog</li>',
    '<li>HTML — standalone file</li>',
    '<li>Markdown — converted from HTML</li>',
    '<li>Plain text — just the words</li>',
    '</ul>',
    '<h2>Selection editing</h2>',
    '<p>Highlight any sentence in this document, then ask the AI to rewrite it. The AI will replace <em>only</em> the highlighted text, leaving the rest untouched.</p>',
    '<blockquote>Tip: try selecting this quote and asking for a more poetic version.</blockquote>',
    '<p>End of demo document.</p>',
  ].join('')
  s.getState().setDocHtml(html)
  s.getState().setDocTitle('DocMate Feature Demo')
  return 'doc set'
})()
