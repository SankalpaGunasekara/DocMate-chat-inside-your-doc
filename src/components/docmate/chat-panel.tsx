'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Send,
  Trash2,
  FilePlus2,
  Check,
  AlertTriangle,
  Loader2,
  Cpu,
  ShieldOff,
  Scissors,
} from 'lucide-react'
import { useAppStore, type ChatMessage, type LlmProvider } from '@/store/app-store'
import { markdownToDocHtml, newId } from '@/lib/markdown'
import { getPreset } from '@/lib/style-presets'
import type { DocEditorHandle, DocSelectionInfo } from './doc-editor'
import { StylePresetSelect } from './style-preset-select'
import { toast } from 'sonner'

interface ChatPanelProps {
  editorRef: React.MutableRefObject<DocEditorHandle | null>
  selection: DocSelectionInfo
}

export function ChatPanel({ editorRef, selection }: ChatPanelProps) {
  const {
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    activeProvider,
    setActiveProvider,
    openrouter,
    nims,
    devMode,
    systemPrompt,
    autoInsert,
    stylePreset,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages / streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const activeConfig = activeProvider === 'openrouter' ? openrouter : nims

  const providerReady = !!(
    activeConfig.apiKey &&
    activeConfig.model &&
    (activeProvider === 'openrouter' || devMode)
  )

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return
    if (!providerReady) {
      toast.error('Provider not configured', {
        description:
          activeProvider === 'openrouter'
            ? 'Add your OpenRouter API key in Settings.'
            : 'Add your NIMS API key in Settings (developer mode).',
      })
      return
    }

    // Capture doc context (trimmed) and any active selection at send time
    const docText = editorRef.current?.getPlainText().trim().slice(0, 4000) ?? ''
    const selText = editorRef.current?.getSelectionText() ?? ''
    const isEditingSelection = selText.trim().length > 0

    const userMsg: ChatMessage = {
      id: newId('u'),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    const aiMsg: ChatMessage = {
      id: newId('a'),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      streaming: true,
    }
    addMessage(userMsg)
    addMessage(aiMsg)
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    // Compose messages for the API.
    // Two modes:
    //  (A) Editing selection: instruct the model to rewrite ONLY the selected
    //      text and return ONLY the replacement.
    //  (B) Default: write/expand the document, with doc context as background.
    // Style preset is merged into both modes — it steers voice/register, not structure.
    const preset = getPreset(stylePreset)
    const styleSuffix = preset.prompt
      ? `\n\n--- Style: ${preset.label} ---\n${preset.prompt}`
      : ''

    const history = [...messages, userMsg]
      .filter((m) => m.role !== 'system' && !m.error)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    let apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    if (isEditingSelection) {
      const editSystemPrompt = `You are a writing assistant embedded in a document editor.
The user has SELECTED a passage in the document and wants you to edit/rewrite/improve it.
Return ONLY the replacement text in Markdown — no preamble, no explanation, no quoting the original.
Use the same general structure (headings, lists) as the selection unless the user asks otherwise.
Tone: tight, useful, no filler.

DELETE INTENT: If the user asks to delete, remove, or cut the selection ("delete this", "remove it", "cut this"),
return the single word [DELETE] on its own line. The editor will remove the selection entirely.
EMPTY INTENT: If the user's instruction doesn't make sense for the selection, return the original text unchanged.${styleSuffix}`

      const selectionBlock = `Selected text to edit (replace this entirely with your reply, or return [DELETE] to remove it):\n"""\n${selText.slice(0, 6000)}\n"""`
      apiMessages = [
        { role: 'system', content: editSystemPrompt },
        { role: 'system', content: selectionBlock },
        ...history,
      ]
    } else {
      const docContext =
        docText.length > 0
          ? `Current document content (for context, do NOT echo this back):\n"""\n${docText}\n"""`
          : ''
      const basePrompt = systemPrompt + styleSuffix
      apiMessages = [
        { role: 'system', content: basePrompt },
        ...(docContext
          ? [{ role: 'system' as const, content: docContext }]
          : []),
        ...history,
      ]
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          apiKey: activeConfig.apiKey,
          model: activeConfig.model,
          baseUrl: activeConfig.baseUrl,
          messages: apiMessages,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        let errMsg = `Request failed (${res.status})`
        try {
          const j = JSON.parse(errText)
          if (j?.error) errMsg = j.error
        } catch {
          /* noop */
        }
        updateMessage(aiMsg.id, {
          streaming: false,
          error: true,
          content: `**Error:** ${errMsg}`,
        })
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const raw of lines) {
          const line = raw.trim()
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload)
            if (json.error) {
              updateMessage(aiMsg.id, {
                streaming: false,
                error: true,
                content: `**Error:** ${json.error}`,
              })
              setStreaming(false)
              return
            }
            if (json.delta) {
              accumulated += json.delta
              updateMessage(aiMsg.id, { content: accumulated })
            }
          } catch {
            /* noop */
          }
        }
      }

      updateMessage(aiMsg.id, { streaming: false })

      // Route the completed response:
      //  - If user had a selection when they hit Send → REPLACE the selection.
      //  - Else if auto-insert is on → APPEND to the doc.
      if (accumulated.trim()) {
        if (isEditingSelection) {
          replaceSelectionInDoc(aiMsg.id, accumulated)
        } else if (autoInsert) {
          insertIntoDoc(aiMsg.id, accumulated)
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        updateMessage(aiMsg.id, { streaming: false })
      } else {
        updateMessage(aiMsg.id, {
          streaming: false,
          error: true,
          content: `**Error:** ${(err as Error).message}`,
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const insertIntoDoc = (msgId: string, content?: string) => {
    const msg = messages.find((m) => m.id === msgId)
    const text = content ?? msg?.content
    if (!text || !text.trim()) return
    const html = markdownToDocHtml(text)
    if (!html) return
    editorRef.current?.insertAiHtml(html)
    updateMessage(msgId, { inserted: true })
    toast.success('Inserted into document')
  }

  const replaceSelectionInDoc = (msgId: string, content?: string) => {
    const msg = messages.find((m) => m.id === msgId)
    const text = content ?? msg?.content
    if (text === undefined || text === null) return

    // DELETE intent — AI returned the [DELETE] marker; remove the selection entirely.
    const trimmed = text.trim()
    if (trimmed === '[DELETE]' || trimmed === 'DELETE') {
      const ok = editorRef.current?.replaceSelectionWithHtml('') ?? false
      if (ok) {
        updateMessage(msgId, { inserted: true, content: '_[selection deleted]_' })
        toast.success('Deleted selection', {
          description: 'The highlighted text was removed from the document.',
        })
      } else {
        toast.info('Selection was lost — nothing to delete')
      }
      return
    }

    if (!trimmed) return
    const html = markdownToDocHtml(text)
    if (!html) return
    const ok = editorRef.current?.replaceSelectionWithHtml(html) ?? false
    if (ok) {
      updateMessage(msgId, { inserted: true })
      toast.success('Replaced selection', {
        description: 'The highlighted text was swapped with the AI response.',
      })
    } else {
      // Selection was lost (e.g. user clicked elsewhere). Fall back to append.
      editorRef.current?.insertAiHtml(html)
      updateMessage(msgId, { inserted: true })
      toast.info('Selection was lost — appended to end instead')
    }
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/*
        Hallmark · chat panel header
        Mono eyebrow "CHAT" label · cobalt status dot · count · clear button.
        Tight 11px monospace meta, no celebratory badges.
      */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="docmate-eyebrow">Chat</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            {streaming ? (
              <Loader2 className="size-2.5 animate-spin text-accent" />
            ) : (
              <span className="size-1.5 rounded-full bg-accent" />
            )}
            <span className="tabular-nums">{messages.length}</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
          onClick={() => {
            if (confirm('Clear all chat messages?')) clearMessages()
          }}
          aria-label="Clear chat"
          title="Clear chat"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>

      {/*
        Hallmark · provider + style row
        Compact mono-styled selects side by side. Provider on the left,
        writing style on the right. Model name shown as mono caption below.
      */}
      <div className="space-y-1.5 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Select
            value={activeProvider}
            onValueChange={(v) => setActiveProvider(v as LlmProvider)}
          >
            <SelectTrigger className="h-7 flex-1 rounded-md border-border bg-background font-mono text-[11px] uppercase tracking-[0.04em]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openrouter">
                <div className="flex items-center gap-2">
                  <Cpu className="size-3.5" />
                  <span>OpenRouter</span>
                </div>
              </SelectItem>
              {devMode && (
                <SelectItem value="nims">
                  <div className="flex items-center gap-2">
                    <ShieldOff className="size-3.5" />
                    <span>NIMS</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <StylePresetSelect />
        </div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {activeConfig.model || 'no model set'}
        </div>
      </div>

      {/* Editing-selection banner — amber accent, scoped to this role only */}
      {selection.hasSelection && (
        <div className="docmate-sel-banner">
          <Scissors className="docmate-sel-banner__icon size-3.5" />
          <div className="min-w-0 flex-1">
            <div className="docmate-sel-banner__title">
              Editing selection · AI will replace
            </div>
            <div className="docmate-sel-banner__preview">
              {selection.length} chars · “{selection.text}{selection.length > 120 ? '…' : ''}”
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="docmate-scroll flex-1 overflow-y-auto">
        <div className="space-y-2.5 p-3">
          {messages.length === 0 && (
            <div className="mt-6 px-2 text-left">
              <p className="font-display text-sm font-semibold text-foreground">
                Ask the assistant
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Tell it what to write — headings, lists, paragraphs, code blocks.
                When it replies, the content lands in your document with formatting.
              </p>
              <div className="mt-4 grid gap-1 text-left">
                {[
                  'Write a 3-section product launch plan for a coffee subscription app',
                  'Summarize the following meeting notes into bullet points',
                  'Draft an apology email to a delayed customer',
                  'Create a comparison table of REST vs GraphQL',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="rounded-md border border-border bg-paper px-2.5 py-1.5 text-left font-mono text-[10px] leading-snug text-muted-foreground transition-colors hover:border-rule-2 hover:bg-paper-2 hover:text-ink-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              onInsert={() => insertIntoDoc(m.id)}
            />
          ))}
        </div>
      </div>

      {/* Input — tight-radius textarea, cobalt accent on Send */}
      <div className="border-t border-border p-3">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !providerReady
                ? 'Open Settings to connect a provider first…'
                : selection.hasSelection
                  ? `Tell the AI how to edit the ${selection.length}-char selection…`
                  : 'Ask the assistant to write, edit, or expand the doc…'
            }
            rows={3}
            disabled={!providerReady && !streaming}
            className="min-h-[72px] resize-none rounded-md border-border bg-paper pr-24 font-sans text-[13px] leading-relaxed placeholder:text-muted-foreground/70 focus-visible:border-accent focus-visible:ring-accent/30"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {streaming ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={stop}
                className="h-6 rounded-md px-2.5 font-mono text-[10px] uppercase tracking-[0.06em]"
              >
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={send}
                disabled={!input.trim() || !providerReady}
                className="h-6 rounded-md bg-accent px-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-accent-ink hover:bg-accent/90"
              >
                <Send className="size-2.5" />
                {selection.hasSelection ? 'Replace' : 'Send'}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
          <span>↵ send · ⇧↵ newline</span>
          <span className="flex items-center gap-2">
            <span>style · {getPreset(stylePreset).label.toLowerCase()}</span>
            <span>auto-insert {autoInsert ? 'on' : 'off'}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  onInsert,
}: {
  msg: ChatMessage
  onInsert: () => void
}) {
  const isUser = msg.role === 'user'
  const bubbleClass = isUser
    ? 'docmate-bubble-user'
    : msg.error
      ? 'docmate-bubble-error'
      : 'docmate-bubble-ai'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[92%] rounded-md px-3 py-2 text-[13px] leading-relaxed ${bubbleClass}`}
      >
        <div className="whitespace-pre-wrap break-words">
          {msg.content || (msg.streaming ? '…' : '')}
          {msg.streaming && (
            <span
              className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-accent align-middle"
              aria-hidden
            />
          )}
        </div>
        {!isUser && !msg.streaming && msg.content && !msg.error && (
          <div className="mt-1.5 flex items-center gap-1 border-t border-rule pt-1.5">
            {msg.inserted ? (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.06em] text-accent">
                <Check className="size-2.5" /> Inserted
              </span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onInsert}
                className="h-5 gap-1 rounded px-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground hover:bg-paper-3 hover:text-accent"
              >
                <FilePlus2 className="size-2.5" /> Insert into doc
              </Button>
            )}
          </div>
        )}
        {msg.error && (
          <div className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.06em] opacity-80">
            <AlertTriangle className="size-2.5" /> Error
          </div>
        )}
      </div>
    </div>
  )
}
