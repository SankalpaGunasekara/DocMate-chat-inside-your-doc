'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Settings, KeyRound, Cpu, ShieldOff, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'

const VERSION_LABEL = 'v0.1.0' // Click this 5x rapidly to unlock dev mode

const POPULAR_OPENROUTER_MODELS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'google/gemini-flash-1.5',
  'meta-llama/llama-3.3-70b-instruct',
  'deepseek/deepseek-chat',
  'qwen/qwen-2.5-72b-instruct',
]

const POPULAR_NIMS_MODELS = [
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-405b-instruct',
  'meta/llama-3.1-70b-instruct',
  'mistralai/mixtral-8x7b-instruct-v0.1',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'qwen/qwen2.5-7b-instruct',
  'deepseek-ai/deepseek-r1',
  'google/gemma-2-9b-it',
]

export function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const {
    openrouter,
    nims,
    devMode,
    systemPrompt,
    autoInsert,
    setOpenRouter,
    setNims,
    setDevMode,
    setSystemPrompt,
    setAutoInsert,
  } = useAppStore()

  // Dev-mode unlock: 5 rapid clicks on the version label
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pulse, setPulse] = useState(false)

  const handleVersionClick = () => {
    clickCountRef.current += 1
    setPulse(true)
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
      setPulse(false)
    }, 1200)
    if (clickCountRef.current >= 5 && !devMode) {
      setDevMode(true)
      toast.success('Developer mode unlocked', {
        description: 'Advanced provider options are now visible.',
      })
      clickCountRef.current = 0
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="size-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4" /> Settings
            {devMode && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Zap className="size-3" /> DEV
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Connect an LLM provider, configure the assistant, and manage the
            document.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="openrouter" className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: devMode ? '1fr 1fr 1fr' : '1fr 1fr' }}>
            <TabsTrigger value="openrouter" className="gap-1.5">
              <Cpu className="size-3.5" /> OpenRouter
            </TabsTrigger>
            <TabsTrigger value="assistant" className="gap-1.5">
              <KeyRound className="size-3.5" /> Assistant
            </TabsTrigger>
            {devMode && (
              <TabsTrigger value="nims" className="gap-1.5">
                <ShieldOff className="size-3.5" /> NIMS
              </TabsTrigger>
            )}
          </TabsList>

          {/* OpenRouter */}
          <TabsContent value="openrouter" className="space-y-4 mt-4">
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Get a key at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                openrouter.ai/keys
              </a>
              . The key is stored only in your browser (localStorage) and is
              sent directly from the server to OpenRouter.
            </div>
            <div className="space-y-2">
              <Label htmlFor="or-key">API key</Label>
              <Input
                id="or-key"
                type="password"
                placeholder="sk-or-v1-..."
                value={openrouter.apiKey}
                onChange={(e) => setOpenRouter({ apiKey: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="or-model">Model</Label>
              <Input
                id="or-model"
                placeholder="openai/gpt-4o-mini"
                value={openrouter.model}
                onChange={(e) => setOpenRouter({ model: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_OPENROUTER_MODELS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setOpenRouter({ model: m })}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px] hover:bg-accent transition-colors"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="or-base">Base URL (optional)</Label>
              <Input
                id="or-base"
                placeholder="https://openrouter.ai/api/v1"
                value={openrouter.baseUrl ?? ''}
                onChange={(e) => setOpenRouter({ baseUrl: e.target.value })}
              />
            </div>
          </TabsContent>

          {/* Assistant */}
          <TabsContent value="assistant" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sys">System prompt</Label>
              <Textarea
                id="sys"
                rows={8}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                This prompt guides how the assistant writes content into the
                document.
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-insert">Auto-insert into document</Label>
                <p className="text-xs text-muted-foreground">
                  When on, completed assistant replies are appended to the doc
                  with formatting. You can still insert manually per message.
                </p>
              </div>
              <Switch
                id="auto-insert"
                checked={autoInsert}
                onCheckedChange={setAutoInsert}
              />
            </div>
          </TabsContent>

          {/* NIMS — only when dev mode is on */}
          {devMode && (
            <TabsContent value="nims" className="space-y-4 mt-4">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                <strong>Developer-only.</strong> NVIDIA NIMs endpoint. Don&apos;t
                share this option with non-dev users. Get a key at{' '}
                <a
                  href="https://build.nvidia.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  build.nvidia.com
                </a>
                .
              </div>
              <div className="space-y-2">
                <Label htmlFor="nim-key">API key</Label>
                <Input
                  id="nim-key"
                  type="password"
                  placeholder="nvapi-..."
                  value={nims.apiKey}
                  onChange={(e) => setNims({ apiKey: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nim-model">Model</Label>
                <Input
                  id="nim-model"
                  placeholder="meta/llama-3.3-70b-instruct"
                  value={nims.model}
                  onChange={(e) => setNims({ model: e.target.value })}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_NIMS_MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNims({ model: m })}
                      className="rounded-full border border-border px-2 py-0.5 text-[10px] hover:bg-accent transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nim-base">Base URL (optional)</Label>
                <Input
                  id="nim-base"
                  placeholder="https://integrate.api.nvidia.com/v1"
                  value={nims.baseUrl ?? ''}
                  onChange={(e) => setNims({ baseUrl: e.target.value })}
                />
              </div>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setDevMode(false)
                  toast.info('Developer mode disabled')
                }}
              >
                Disable developer mode
              </Button>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="flex !flex-col gap-3 items-stretch sm:items-center">
          <Button onClick={() => setOpen(false)}>Done</Button>
          <button
            type="button"
            onClick={handleVersionClick}
            className={`mx-auto text-[10px] text-muted-foreground/50 transition-all ${pulse ? 'scale-110 text-muted-foreground' : ''}`}
            aria-label="App version"
          >
            {VERSION_LABEL}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
