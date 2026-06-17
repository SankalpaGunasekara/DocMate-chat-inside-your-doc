// Quick test of markdownToDocHtml
import { markdownToDocHtml, wrapAiInsert, sanitizeDocHtml } from '../src/lib/markdown'

const samples = [
  '# Heading 1\n\n## Heading 2\n\n### Heading 3',
  'This is **bold** and *italic* and ~~strike~~ and `inline code`.',
  '- Bullet one\n- Bullet two\n  - Nested\n- Bullet three',
  '1. First\n2. Second\n3. Third',
  '> A blockquote\n> with two lines',
  '```js\nconst x = 42;\nconsole.log(x);\n```',
  '| Col A | Col B |\n|-------|-------|\n| 1     | 2     |\n| 3     | 4     |',
  '<div style="text-align:center">Centered text</div>',
  '<script>alert("xss")</script><img src=x onerror="alert(1)">',
]

for (const s of samples) {
  console.log('--- INPUT ---')
  console.log(s)
  console.log('--- OUTPUT (markdownToDocHtml) ---')
  console.log(markdownToDocHtml(s))
  console.log('')
}

console.log('--- wrapAiInsert test ---')
console.log(wrapAiInsert(markdownToDocHtml('## Hi\n\n- a\n- b')))

console.log('--- sanitizeDocHtml test ---')
console.log(sanitizeDocHtml('<p onclick="alert(1)">hi</p><script>bad</script>'))
