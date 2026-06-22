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
import { MessageSquare, Moon, Sun, RotateCcw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { DocEditor, type DocEditorHandle, type DocSelectionInfo } from '@/components/docmate/doc-editor'
import { ChatPanel, type PendingRewrite } from '@/components/docmate/chat-panel'
import { SettingsDialog } from '@/components/docmate/settings-dialog'
import { ExportMenu } from '@/components/docmate/export-menu'
import { HelpDialog } from '@/components/docmate/help-dialog'
import { useAppStore } from '@/store/app-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { getPreset, type StylePresetId } from '@/lib/style-presets'
import { toast } from 'sonner'

const EMPTY_SELECTION: DocSelectionInfo = { hasSelection: false, text: '', length: 0 }

export default function Home() {
  const editorRef = useRef<DocEditorHandle | null>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  // Live selection state — tracked silently for the editor ref's saved-range
  // fallback. The banner does NOT show on this; it shows on `pendingEdit`.
  const [selection, setSelection] = useState<DocSelectionInfo>(EMPTY_SELECTION)
  // pendingEdit — true only after the user explicitly invokes "Send to edit"
  // or "Rewrite as…". Gates banner visibility + edit-mode in send().
  const [pendingEdit, setPendingEdit] = useState(false)
  // pendingRewrite — when set, ChatPanel auto-sends a rewrite with the given
  // instruction. Cleared after the send fires.
  const [pendingRewrite, setPendingRewrite] = useState<PendingRewrite | null>(null)
  const resetDoc = useAppStore((s) => s.resetDoc)
  const isMobile = useIsMobile()

  const handleSelectionChange = (info: DocSelectionInfo) => {
    setSelection(info)
  }

  /**
   * Focus the chat input. On mobile, opens the chat Sheet first.
   */
  const focusChatInput = (delay = 0) => {
    const doFocus = () => {
      const ta = document.querySelector(
        'textarea[placeholder*="edit"], textarea[placeholder*="assistant"]',
      ) as HTMLTextAreaElement | null
      ta?.focus()
    }
    if (delay > 0) {
      setTimeout(doFocus, delay)
    } else {
      doFocus()
    }
  }

  /**
   * Called when the user picks "Send to edit" from the doc's right-click menu.
   * Enters edit mode (shows the banner) and focuses the chat input. The
   * selection stays in the doc — the chat panel reads it at send time via
   * editorRef.getSelectionText().
   */
  const handleSendToEdit = () => {
    const selText = editorRef.current?.getSelectionText() ?? ''
    if (!selText.trim()) {
      toast.warning('No selection', {
        description: 'Select some text in the doc first, then right-click.',
      })
      return
    }
    setPendingEdit(true)
    if (isMobile) {
      setMobileChatOpen(true)
      focusChatInput(300)
    } else {
      focusChatInput()
    }
    toast.info('Selection ready to edit', {
      description: 'Type how you want to rewrite it, then press Replace.',
    })
  }

  /**
   * Called when the user picks a style from "Rewrite as…" in the right-click
   * menu. Sets the style preset, enters edit mode, AND triggers an auto-send
   * with a default rewrite instruction in that style.
   */
  const handleRewriteAs = (presetId: StylePresetId) => {
    const preset = getPreset(presetId)
    const selText = editorRef.current?.getSelectionText() ?? ''
    if (!selText.trim()) {
      toast.warning('No selection', {
        description: 'Select some text in the doc first, then right-click.',
      })
      return
    }
    // Set the style preset in the store (persists for future sends too)
    useAppStore.getState().setStylePreset(presetId)
    // Enter edit mode
    setPendingEdit(true)
    // Queue the auto-rewrite — ChatPanel will pick this up and call send()
    setPendingRewrite({
      instruction: `Rewrite this in the ${preset.label} style.`,
    })
    if (isMobile) {
      setMobileChatOpen(true)
    }
    toast.success(`Rewriting as ${preset.label}`, {
      description: preset.hint,
    })
  }

  /** Called by ChatPanel after a send completes (or errors) — exits edit mode. */
  const handleEditComplete = () => {
    setPendingEdit(false)
  }

  /** Called by ChatPanel after it consumes the pendingRewrite trigger. */
  const handlePendingRewriteConsumed = () => {
    setPendingRewrite(null)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    void useAppStore.persist.rehydrate()
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
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
          <HelpDialog />
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
                  <ChatPanel
                    editorRef={editorRef}
                    selection={selection}
                    pendingEdit={pendingEdit}
                    pendingRewrite={pendingRewrite}
                    onEditComplete={handleEditComplete}
                    onPendingRewriteConsumed={handlePendingRewriteConsumed}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {isMobile ? (
          <DocEditor
            editorRef={editorRef}
            onSelectionChange={handleSelectionChange}
            onSendToEdit={handleSendToEdit}
            onRewriteAs={handleRewriteAs}
          />
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={68} minSize={40}>
              <DocEditor
                editorRef={editorRef}
                onSelectionChange={handleSelectionChange}
                onSendToEdit={handleSendToEdit}
                onRewriteAs={handleRewriteAs}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={32} minSize={22} maxSize={55}>
              <ChatPanel
                editorRef={editorRef}
                selection={selection}
                pendingEdit={pendingEdit}
                pendingRewrite={pendingRewrite}
                onEditComplete={handleEditComplete}
                onPendingRewriteConsumed={handlePendingRewriteConsumed}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>
    </div>
  )
}
