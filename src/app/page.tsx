'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { MessageSquare, Moon, Sun, RotateCcw, Settings2, Download } from 'lucide-react'
import { useTheme } from 'next-themes'
import { DocEditor, type DocEditorHandle, type DocSelectionInfo } from '@/components/docmate/doc-editor'
import { ChatPanel } from '@/components/docmate/chat-panel'
import { SettingsDialog } from '@/components/docmate/settings-dialog'
import { ExportMenu } from '@/components/docmate/export-menu'
import { useAppStore } from '@/store/app-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'

const EMPTY_SELECTION: DocSelectionInfo = { hasSelection: false, text: '', length: 0 }

export default function Home() {
  const editorRef = useRef<DocEditorHandle | null>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [selection, setSelection] = useState<DocSelectionInfo>(EMPTY_SELECTION)
  const resetDoc = useAppStore((s) => s.resetDoc)
  const isMobile = useIsMobile()

  const handleSelectionChange = (info: DocSelectionInfo) => {
    setSelection(info)
  }

  /**
   * Called when the user picks "Send to edit" from the doc's right-click menu.
   * Finds the chat textarea and focuses it. The selection itself stays in the
   * doc — the chat panel reads it at send time. On mobile, this also opens the
   * chat Sheet so the user can see the input.
   */
  const handleSendToEdit = () => {
    if (isMobile) {
      setMobileChatOpen(true)
      // Give the Sheet a tick to mount before focusing
      setTimeout(() => {
        const ta = document.querySelector(
          'textarea[placeholder*="edit"]',
        ) as HTMLTextAreaElement | null
        ta?.focus()
      }, 250)
    } else {
      const ta = document.querySelector(
        'textarea[placeholder*="edit"]',
      ) as HTMLTextAreaElement | null
      ta?.focus()
    }
    toast.info('Selection ready to edit', {
      description: 'Type how you want to rewrite it, then press Send.',
    })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    // Manually rehydrate the zustand store from localStorage AFTER React has
    // mounted & hydrated. This prevents SSR/client mismatches because the
    // store uses `skipHydration: true`.
    void useAppStore.persist.rehydrate()
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/*
        Hallmark · nav: N9 edge-aligned minimal
        Wordmark left with a tiny cobalt dot (carried by .docmate-wordmark).
        Action cluster right: reset · theme · settings · export · (mobile: chat).
        Hairline border-bottom only. No backdrop blur, no shadow — earned restraint.
      */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="docmate-wordmark">DocMate</span>
          <span
            className="hidden sm:inline-block h-3 w-px bg-border"
            aria-hidden
          />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:inline">
            chat&nbsp;inside&nbsp;your&nbsp;doc
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={() => {
              if (
                confirm(
                  'Reset the document and clear its content? Chat history stays.',
                )
              ) {
                resetDoc()
                const el = document.querySelector(
                  '.docmate-prose',
                ) as HTMLElement | null
                if (el) el.innerHTML = ''
                toast.info('Document reset')
              }
            }}
            aria-label="Reset document"
            title="Reset document"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
            </Button>
          )}
          <SettingsDialog />
          <ExportMenu />
          {isMobile && (
            <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                  aria-label="Open chat"
                  title="Open chat"
                >
                  <MessageSquare className="size-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 flex flex-col border-border"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Chat</SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0">
                  <ChatPanel editorRef={editorRef} selection={selection} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Main: only ONE DocEditor + ONE ChatPanel mounted at a time */}
      <main className="min-h-0 flex-1">
        {isMobile ? (
          <DocEditor
            editorRef={editorRef}
            onSelectionChange={handleSelectionChange}
            onSendToEdit={handleSendToEdit}
          />
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={68} minSize={40}>
              <DocEditor
                editorRef={editorRef}
                onSelectionChange={handleSelectionChange}
                onSendToEdit={handleSendToEdit}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={32} minSize={22} maxSize={55}>
              <ChatPanel editorRef={editorRef} selection={selection} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>
    </div>
  )
}
