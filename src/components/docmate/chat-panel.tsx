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
} from 'lucide-react'
import { useAppStore, type ChatMessage, type LlmProvider } from '@/store/app-store'
import { markdownToDocHtml, newId } from '@/lib/markdown'
import type { DocEditorHandle } from './doc-editor'
import { toast } from 'sonner'

interface ChatPanelProps {
  editorRef: React.MutableRefObject<DocEditorHandle | null>
}

export function ChatPanel({ editorRef }: ChatPanelProps) {
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

    // Capture doc context (trimmed)
    const docText = editorRef.current?.getPlainText().trim().slice(0, 4000) ?? ''
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

    // Compose messages for the API: system + doc context + history (last 10) + user
    const history = [...messages, userMsg]
      .filter((m) => m.role !== 'system' && !m.error)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const docContext =
      docText.length > 0
        ? `Current document content (for context, do NOT echo this back):\n"""\n${docText}\n"""`
        : ''

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...(docContext
        ? [{ role: 'system' as const, content: docContext }]
        : []),
      ...history,
    ]

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

      // Auto-insert into doc if enabled
      if (autoInsert && accumulated.trim()) {
        insertIntoDoc(aiMsg.id, accumulated)
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
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium">Chat</span>
          <Badge variant="outline" className="gap-1 text-[10px] font-normal">
            {streaming ? (
              <Loader2 className="size-2.5 animate-spin" />
            ) : (
              <span className="size-1.5 rounded-full bg-emerald-500" />
            )}
            {messages.length} msgs
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            if (confirm('Clear all chat messages?')) clearMessages()
          }}
          aria-label="Clear chat"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Provider switcher */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Select
          value={activeProvider}
          onValueChange={(v) => setActiveProvider(v as LlmProvider)}
        >
          <SelectTrigger className="h-8 text-xs">
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
        <div className="truncate text-[10px] text-muted-foreground">
          {activeConfig.model || 'no model set'}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-3">
          {messages.length === 0 && (
            <div className="mt-8 px-4 text-center text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Ask the assistant</p>
              <p className="text-xs leading-relaxed">
                Tell it what to write — headings, lists, paragraphs, code
                blocks. When it replies, the content lands in your document with
                formatting.
              </p>
              <div className="mt-4 grid gap-1.5 text-left">
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
                    className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-left text-[11px] hover:bg-muted transition-colors"
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

      {/* Input */}
      <div className="border-t p-3">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              providerReady
                ? 'Ask the assistant to write, edit, or expand the doc…'
                : 'Open Settings to connect a provider first…'
            }
            rows={3}
            disabled={!providerReady && !streaming}
            className="min-h-[72px] resize-none pr-24 text-sm"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {streaming ? (
              <Button size="sm" variant="secondary" onClick={stop} className="h-7 gap-1 text-xs">
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={send}
                disabled={!input.trim() || !providerReady}
                className="h-7 gap-1 text-xs"
              >
                <Send className="size-3" />
                Send
              </Button>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Enter to send · Shift+Enter for newline</span>
          <span>Auto-insert: {autoInsert ? 'on' : 'off'}</span>
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
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[92%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : msg.error
              ? 'bg-destructive/10 text-destructive border border-destructive/30'
              : 'bg-muted'
        }`}
      >
        <div className="whitespace-pre-wrap break-words leading-relaxed">
          {msg.content || (msg.streaming ? '…' : '')}
          {msg.streaming && (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle" />
          )}
        </div>
        {!isUser && !msg.streaming && msg.content && !msg.error && (
          <div className="mt-1.5 flex items-center gap-1 border-t border-border/40 pt-1.5 opacity-100">
            {msg.inserted ? (
              <Badge variant="outline" className="gap-1 text-[10px] font-normal text-emerald-600">
                <Check className="size-2.5" /> Inserted
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onInsert}
                className="h-6 gap-1 px-2 text-[10px]"
              >
                <FilePlus2 className="size-3" /> Insert into doc
              </Button>
            )}
          </div>
        )}
        {msg.error && (
          <div className="mt-1 flex items-center gap-1 text-[10px] opacity-80">
            <AlertTriangle className="size-2.5" /> Error
          </div>
        )}
      </div>
    </div>
  )
}
