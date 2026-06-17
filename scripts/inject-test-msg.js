// Inject test messages via the exposed dev store
(() => {
  const s = window.__docmateStore
  if (!s) return 'no store'

  s.getState().clearMessages()

  s.getState().addMessage({
    id: 'test-u1',
    role: 'user',
    content: 'Write a quick intro about AI.',
    createdAt: Date.now(),
  })

  s.getState().addMessage({
    id: 'test-a1',
    role: 'assistant',
    content: [
      '## Why AI Matters',
      '',
      'Artificial intelligence is reshaping how we **work**, *learn*, and create. From automating routine tasks to unlocking new forms of creativity, AI has become an everyday collaborator.',
      '',
      '### Key benefits',
      '',
      '- Faster iteration on ideas',
      '- Personalized assistance at scale',
      '- Accessible expert-level reasoning',
      '',
      '> The best time to plant a tree was 20 years ago. The second best time is now.',
    ].join('\n'),
    createdAt: Date.now(),
  })

  return 'messages added'
})()
