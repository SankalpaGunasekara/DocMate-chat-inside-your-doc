'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, Keyboard, MousePointerClick, Scissors, Sparkles, Download, Settings, Zap, FileText } from 'lucide-react'

export function HelpDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-7 rounded-md font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground hover:text-foreground hover:bg-secondary">
          <HelpCircle className="size-3.5" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            DocMate — the basics
          </DialogTitle>
          <DialogDescription>
            A Google Docs-style editor where you chat with an AI assistant
            and it writes formatted content straight into the document you
            have open. Here&apos;s everything you need to know.
          </DialogDescription>
        </DialogHeader>

        {/* Visual legend — explains the AI-insert markers */}
        <div className="rounded-md border border-border bg-paper-2 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Visual legend
            </span>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-foreground">
            The thin vertical line on the left side of some text — with a
            small cobalt square at the top — marks content the AI wrote for
            you. It&apos;s a visual marker, not a tab or indentation.
          </p>
          <div className="rounded-md border border-border bg-paper p-3">
            <div
              className="relative pl-3"
              style={{
                borderLeft: '1px solid var(--color-rule)',
              }}
            >
              <span
                className="absolute -left-[3.5px] top-1 size-1.5 rounded-[1px] bg-accent"
                aria-hidden
              />
              <p className="text-[12px] text-foreground">
                ← This is an AI-inserted block. The line + cobalt square
                mark it as AI-written. Hover the block to see the line
                turn cobalt.
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            To remove AI markers: delete the text, or use{' '}
            <kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">↺ Reset</kbd>{' '}
            in the top bar to clear the whole doc.
          </p>
        </div>

        {/* FAQ accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="getting-started">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Settings className="size-3.5 text-accent" />
                Getting started
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <ol className="ml-4 list-decimal space-y-1.5">
                <li>
                  Click <strong className="text-foreground">Settings</strong> in the
                  top bar (top-right).
                </li>
                <li>
                  Paste your <strong className="text-foreground">OpenRouter API key</strong>{' '}
                  (get one at{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    openrouter.ai/keys
                  </a>
                  ). Pick a model like <code className="rounded bg-paper-2 px-1 font-mono text-[10px]">openai/gpt-4o-mini</code>.
                </li>
                <li>
                  Click <strong className="text-foreground">Done</strong>. The chat
                  input on the right is now enabled.
                </li>
                <li>
                  Type a prompt like &quot;Write a 3-section product launch
                  plan&quot; and press <kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">Enter</kbd>.
                </li>
                <li>
                  The AI&apos;s reply lands in your document with formatting
                  (headings, lists, code blocks, tables) — automatically, no
                  copy-paste needed.
                </li>
              </ol>
              <p className="mt-2">
                Your API key is stored only in your browser&apos;s localStorage
                and is sent directly to OpenRouter. It never touches our server.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="chat-modes">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <MousePointerClick className="size-3.5 text-accent" />
                Two chat modes: Append &amp; Replace
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-2">
                <strong className="text-foreground">Append mode (default):</strong>{' '}
                When you send a normal message, the AI&apos;s reply is added to
                the <em>end</em> of your document. Use this to build up a doc
                section by section.
              </p>
              <p className="mb-2">
                <strong className="text-foreground">Replace mode:</strong>{' '}
                When you select text in the doc and then send a message, the
                AI&apos;s reply <em>replaces</em> only the selected text. The
                rest of the document stays untouched.
              </p>
              <p>
                Toggle auto-insert on/off in{' '}
                <strong className="text-foreground">Settings → Assistant</strong>.
                Even with auto-insert off, you can click{' '}
                <strong className="text-foreground">Insert into doc</strong> on
                any AI message to add it manually.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="right-click">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Scissors className="size-3.5 text-accent" />
                Right-click menu &amp; Send to edit
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-2">
                Right-click anywhere in the document to open a custom menu:
              </p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>
                  <strong className="text-foreground">✂ Send to edit</strong> —
                  Available only when text is selected. Enters Replace mode:
                  the amber &quot;Editing selection&quot; banner appears, the
                  Send button becomes &quot;Replace&quot;. Type your rewrite
                  instruction and press Replace.
                </li>
                <li>
                  <strong className="text-foreground">Rewrite as…</strong> —
                  A submenu with 9 writing styles. Pick one (e.g.
                  &quot;Academic&quot;) and the AI immediately rewrites your
                  selection in that style — no typing needed.
                </li>
                <li>
                  <strong className="text-foreground">Cut / Copy / Paste / Select all</strong> —
                  standard edit actions (we replace the native browser menu).
                </li>
              </ul>
              <p className="mt-2">
                The amber banner has an <strong className="text-foreground">✕ button</strong>{' '}
                to cancel Replace mode without sending.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="styles">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <FileText className="size-3.5 text-accent" />
                Writing styles
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-2">
                The style dropdown (next to the provider dropdown in the chat
                panel) lets you steer the AI&apos;s voice. Pick one before
                sending:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['Default', 'Balanced, clear'],
                  ['Academic', 'Third person, hedged'],
                  ['Daily', 'First person, casual'],
                  ['Technical', 'Imperative, exact'],
                  ['Marketing', 'Benefit-led, scannable'],
                  ['Journalistic', 'AP style, attributed'],
                  ['Formal', 'Polite, no contractions'],
                  ['Poetic', 'Image-led, rhythmic'],
                  ['Concise', 'Telegraphic, half the words'],
                ].map(([name, hint]) => (
                  <div key={name} className="rounded border border-border bg-paper px-2 py-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-foreground">
                      {name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {hint}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2">
                The active style is shown in the input meta line as{' '}
                <code className="rounded bg-paper-2 px-1 font-mono text-[10px]">style · academic</code>.
                You can also pick a style via right-click → Rewrite as… which
                auto-applies it to a selection.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="delete-intent">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Scissors className="size-3.5 text-accent" />
                Deleting text via AI
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p>
                In Replace mode, if you type &quot;delete this&quot;,
                &quot;remove it&quot;, or &quot;cut this&quot;, the AI returns
                a special marker and DocMate removes the selection entirely.
                You&apos;ll see a &quot;Deleted selection&quot; toast. This is
                faster than manually selecting + pressing Delete.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="export">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Download className="size-3.5 text-accent" />
                Exporting your document
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-2">
                Click <strong className="text-foreground">Export</strong> in the
                top bar to download your doc in one of five formats:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li><strong className="text-foreground">Word (.doc)</strong> — opens in MS Word, LibreOffice, Google Docs</li>
                <li><strong className="text-foreground">PDF</strong> — via the browser&apos;s print dialog (pick &quot;Save as PDF&quot;)</li>
                <li><strong className="text-foreground">HTML</strong> — standalone file with embedded CSS</li>
                <li><strong className="text-foreground">Markdown</strong> — converted from the doc HTML</li>
                <li><strong className="text-foreground">Plain text</strong> — just the words</li>
              </ul>
              <p className="mt-2">
                All exports run in your browser — no server roundtrip.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai-insert-lines">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-accent" />
                What are those left-side vertical lines?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-2">
                Those are <strong className="text-foreground">AI-insert markers</strong> —
                not tabs, not indentation. Every time the AI writes content
                into your document, that content gets wrapped in a section
                with:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>A thin hairline border on the left side</li>
                <li>A small cobalt square at the top-left corner</li>
              </ul>
              <p className="mt-2">
                The marker is purely visual — it helps you see at a glance
                which parts of the doc were AI-written vs. typed by you. The
                text inside is normal editable content.
              </p>
              <p className="mt-2">
                <strong className="text-foreground">To remove the markers:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Delete the AI-written text (the marker goes with it)</li>
                <li>Or click <strong className="text-foreground">↺ Reset</strong> in the top bar to clear the entire document and start fresh (chat history is preserved)</li>
              </ul>
              <p className="mt-2">
                The markers do <em>not</em> affect exports — Word/PDF/HTML/MD
                files render the content cleanly without the markers.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shortcuts">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Keyboard className="size-3.5 text-accent" />
                Keyboard shortcuts
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">Ctrl+B</kbd> Bold</div>
                <div><kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">Ctrl+I</kbd> Italic</div>
                <div><kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">Ctrl+U</kbd> Underline</div>
                <div><kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">Enter</kbd> Send chat message</div>
                <div><kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">Shift+Enter</kbd> New line in chat</div>
                <div><kbd className="rounded border border-border bg-paper px-1 py-0.5 font-mono text-[9px]">Right-click</kbd> Context menu on doc</div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="nims">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Zap className="size-3.5 text-accent" />
                NIMS — the hidden dev option
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-2">
                DocMate supports a second LLM provider — NVIDIA NIMs — but
                it&apos;s hidden by default to avoid confusing non-developer
                users. To unlock it:
              </p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Open <strong className="text-foreground">Settings</strong></li>
                <li>
                  Click the tiny version label at the bottom-left of the
                  dialog (e.g. <code className="rounded bg-paper-2 px-1 font-mono text-[10px]">v0.1.0</code>){' '}
                  <strong className="text-foreground">5 times rapidly</strong>
                </li>
                <li>
                  A <Badge variant="secondary" className="ml-1 gap-1 text-[9px]"><Zap className="size-2.5" /> DEV</Badge> badge
                  appears and a new <strong className="text-foreground">NIMS</strong> tab
                  shows up with an amber &quot;Developer-only&quot; warning.
                </li>
                <li>
                  Add your NIMS API key from{' '}
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    build.nvidia.com
                  </a>{' '}
                  and switch the provider dropdown to NIMS.
                </li>
              </ol>
              <p className="mt-2">
                To lock it back: open the NIMS tab → click &quot;Disable
                developer mode&quot;.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="persistence">
            <AccordionTrigger className="text-[13px] font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Settings className="size-3.5 text-accent" />
                Where is my data stored?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-[12px] leading-relaxed text-muted-foreground">
              <p className="mb-2">
                <strong className="text-foreground">Everything is in your browser.</strong>{' '}
                DocMate uses localStorage for:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>API keys (OpenRouter + NIMS)</li>
                <li>Document title + content</li>
                <li>Active provider + model</li>
                <li>System prompt + auto-insert toggle</li>
                <li>Writing style preset</li>
                <li>Dev mode flag</li>
              </ul>
              <p className="mt-2">
                <strong className="text-foreground">Chat messages are NOT persisted</strong> —
                they reset every session so you start fresh. The only server
                call is the streaming proxy at{' '}
                <code className="rounded bg-paper-2 px-1 font-mono text-[10px]">/api/chat</code>{' '}
                which forwards your request to OpenRouter/NIMS and pipes the
                response back. No data is stored on the server.
              </p>
              <p className="mt-2">
                Clear your data: open browser DevTools → Application →
                Local Storage → delete the <code className="rounded bg-paper-2 px-1 font-mono text-[10px]">docmate-store</code> key.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            DocMate · chat inside your doc
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 rounded-md font-mono text-[10px] uppercase tracking-[0.06em]"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
