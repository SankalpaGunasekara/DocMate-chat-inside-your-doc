'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type LlmProvider = 'openrouter' | 'nims'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  inserted?: boolean
  streaming?: boolean
  error?: boolean
}

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

interface AppState {
  // Provider selection
  activeProvider: LlmProvider
  openrouter: ProviderConfig
  nims: ProviderConfig

  // Dev mode (hidden NIMs unlock)
  devMode: boolean

  // Doc
  docTitle: string
  docHtml: string

  // Chat
  messages: ChatMessage[]
  systemPrompt: string
  autoInsert: boolean

  // Actions
  setActiveProvider: (p: LlmProvider) => void
  setOpenRouter: (c: Partial<ProviderConfig>) => void
  setNims: (c: Partial<ProviderConfig>) => void
  setDevMode: (v: boolean) => void
  setDocTitle: (t: string) => void
  setDocHtml: (h: string) => void
  setSystemPrompt: (s: string) => void
  setAutoInsert: (v: boolean) => void
  addMessage: (m: ChatMessage) => void
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void
  clearMessages: () => void
  resetDoc: () => void
}

const DEFAULT_SYSTEM_PROMPT = `You are a writing assistant embedded inside a live document editor.
The user is chatting with you to help produce, refine, or expand the document they are working on.
Reply using Markdown so your output can be rendered with proper formatting into the document.
Rules:
- Use # / ## / ### for headings.
- Use **bold**, *italic*, ~~strikethrough~~, and \`inline code\` where helpful.
- Use - or * for bullet lists and 1. for numbered lists.
- Use > for quotes and \`\`\`language ... \`\`\` for code blocks.
- Keep prose tight and useful. Don't preface your answer with "Here is..." — just write the content.
- If the user asks for an alignment hint, you may wrap a block in <div style="text-align:center">...</div> etc.
- When the user references existing document content, treat it as context, not as something to copy back.`

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeProvider: 'openrouter',
      openrouter: {
        apiKey: '',
        model: 'openai/gpt-4o-mini',
        baseUrl: 'https://openrouter.ai/api/v1',
      },
      nims: {
        apiKey: '',
        model: 'meta/llama-3.3-70b-instruct',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
      },
      devMode: false,
      docTitle: 'Untitled document',
      docHtml: '',
      messages: [],
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      autoInsert: true,

      setActiveProvider: (p) => set({ activeProvider: p }),
      setOpenRouter: (c) =>
        set((s) => ({ openrouter: { ...s.openrouter, ...c } })),
      setNims: (c) => set((s) => ({ nims: { ...s.nims, ...c } })),
      setDevMode: (v) => set({ devMode: v }),
      setDocTitle: (t) => set({ docTitle: t }),
      setDocHtml: (h) => set({ docHtml: h }),
      setSystemPrompt: (sp) => set({ systemPrompt: sp }),
      setAutoInsert: (v) => set({ autoInsert: v }),
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      updateMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        })),
      clearMessages: () => set({ messages: [] }),
      resetDoc: () => set({ docHtml: '', docTitle: 'Untitled document' }),
    }),
    {
      name: 'docmate-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        activeProvider: s.activeProvider,
        openrouter: s.openrouter,
        nims: s.nims,
        devMode: s.devMode,
        docTitle: s.docTitle,
        docHtml: s.docHtml,
        systemPrompt: s.systemPrompt,
        autoInsert: s.autoInsert,
        // Don't persist messages to keep conversations fresh per session
      }),
    },
  ),
)

// Dev-only: expose the store on window for debugging and e2e testing.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  ;(window as unknown as { __docmateStore?: typeof useAppStore }).__docmateStore =
    useAppStore
}
