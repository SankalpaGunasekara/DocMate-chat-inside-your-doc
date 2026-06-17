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
import { MessageSquare, Moon, Sun, FileText, RotateCcw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { DocEditor, type DocEditorHandle } from '@/components/docmate/doc-editor'
import { ChatPanel } from '@/components/docmate/chat-panel'
import { SettingsDialog } from '@/components/docmate/settings-dialog'
import { useAppStore } from '@/store/app-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'

export default function Home() {
  const editorRef = useRef<DocEditorHandle | null>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const resetDoc = useAppStore((s) => s.resetDoc)
  const isMobile = useIsMobile()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-semibold">DocMate</span>
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            · chat inside your doc
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
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
          >
            <RotateCcw className="size-3.5" />
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
            </Button>
          )}
          <SettingsDialog />
          {/* Mobile chat trigger */}
          {isMobile && (
            <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Open chat"
                >
                  <MessageSquare className="size-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 flex flex-col"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Chat</SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0">
                  <ChatPanel editorRef={editorRef} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Main: only ONE DocEditor + ONE ChatPanel mounted at a time */}
      <main className="min-h-0 flex-1">
        {isMobile ? (
          // Mobile: doc only (chat is in the Sheet above)
          <DocEditor editorRef={editorRef} />
        ) : (
          // Desktop: resizable split
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={68} minSize={40}>
              <DocEditor editorRef={editorRef} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={32} minSize={22} maxSize={55}>
              <ChatPanel editorRef={editorRef} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>
    </div>
  )
}
