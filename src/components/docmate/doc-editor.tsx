'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eraser,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/store/app-store'
import { sanitizeDocHtml, wrapAiInsert } from '@/lib/markdown'

interface DocEditorProps {
  /** imperative ref handle for parent (chat panel) to call */
  editorRef?: React.MutableRefObject<DocEditorHandle | null>
  /** Called whenever the in-doc selection changes (text + range present flag). */
  onSelectionChange?: (info: DocSelectionInfo) => void
}

export interface DocSelectionInfo {
  /** Whether there's a non-empty selection inside the editor */
  hasSelection: boolean
  /** The plain-text content of the selection (truncated for display) */
  text: string
  /** Approximate length of the selected text */
  length: number
}

export interface DocEditorHandle {
  /** Insert HTML at end of doc, wrapped as an AI insert */
  insertAiHtml: (html: string) => void
  /** Replace the current doc selection with the given HTML (wrapped as AI insert). Returns true if a selection was replaced. */
  replaceSelectionWithHtml: (html: string) => boolean
  /** Get the plain text of the doc (for context to LLM) */
  getPlainText: () => string
  /** Get the plain text of the current in-doc selection (or '' if none). */
  getSelectionText: () => string
  /** Get the HTML of the current in-doc selection (or '' if none). */
  getSelectionHtml: () => string
  /** Focus the editor */
  focus: () => void
}

function exec(cmd: string, value?: string) {
  try {
    document.execCommand(cmd, false, value)
  } catch {
    // ignore
  }
}

export function DocEditor({ editorRef, onSelectionChange }: DocEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const docHtml = useAppStore((s) => s.docHtml)
  const docTitle = useAppStore((s) => s.docTitle)
  const setDocHtml = useAppStore((s) => s.setDocHtml)
  const setDocTitle = useAppStore((s) => s.setDocTitle)
  // Keep latest onSelectionChange without re-running the listener effect
  const onSelChangeRef = useRef(onSelectionChange)
  useEffect(() => {
    onSelChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  // Track the last non-collapsed selection range inside our editor, so that
  // we can still replace it after the user clicks into the chat input (which
  // collapses the live window.Selection).
  const savedRangeRef = useRef<Range | null>(null)

  /** Notify parent of current selection state */
  const notifySelection = useCallback(() => {
    const cb = onSelChangeRef.current
    if (!cb) return
    const el = editableRef.current
    if (!el) {
      cb({ hasSelection: false, text: '', length: 0 })
      return
    }
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      // Don't clear the saved range here — user might have just clicked into
      // the chat input. We keep the last real selection around so the chat
      // panel can still report it via the `selection` prop until they make a
      // new selection or the replacement happens.
      // BUT: we DO want to notify that there's no live selection right now,
      // so the chat panel can hide the badge when the user truly deselects.
      // Compromise: if the new selection is INSIDE our editor (just collapsed
      // caret), keep the badge up using the saved range.
      // If the selection moved OUT of our editor entirely (e.g. focused the
      // chat input), also keep the badge up — the saved range is still valid.
      // The badge is only cleared when an actual replacement happens (which
      // calls notifySelection explicitly with an empty state).
      return
    }
    const range = sel.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) {
      return
    }
    const text = sel.toString()
    if (text.length === 0) return
    // Save a clone of this range so we can use it later
    savedRangeRef.current = range.cloneRange()
    cb({
      hasSelection: true,
      text: text.slice(0, 120),
      length: text.length,
    })
  }, [])

  /** Force-clear the saved range and notify parent (called after a replacement) */
  const clearSavedSelection = useCallback(() => {
    savedRangeRef.current = null
    const cb = onSelChangeRef.current
    if (cb) cb({ hasSelection: false, text: '', length: 0 })
  }, [])

  // Listen for selection changes globally; only fire callback when inside us
  useEffect(() => {
    const handler = () => notifySelection()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [notifySelection])

  // Initial load: set innerHTML from store AFTER zustand has hydrated from
  // localStorage. The store's default `docHtml` is '' on first render, so we
  // must wait for hydration before reading the persisted value.
  const initRef = useRef(false)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHydrated(true)
      return
    }
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])
  useEffect(() => {
    if (!hydrated || initRef.current) return
    if (editableRef.current) {
      editableRef.current.innerHTML = docHtml || ''
    }
    initRef.current = true
  }, [hydrated, docHtml])

  // Persist to store (debounced via microtask)
  const persist = useCallback(() => {
    if (editableRef.current) {
      setDocHtml(editableRef.current.innerHTML)
    }
  }, [setDocHtml])

  const handleInput = () => {
    persist()
  }

  // Expose imperative API to parent
  useEffect(() => {
    if (!editorRef) return
    editorRef.current = {
      insertAiHtml: (html: string) => {
        const el = editableRef.current
        if (!el) return
        const safe = sanitizeDocHtml(html)
        const wrapped = wrapAiInsert(safe)
        // Append at root level (avoids being nested inside whatever the
        // caret currently sits in — e.g. a list item).
        // Use a template to parse the wrapped HTML into nodes.
        const tpl = document.createElement('template')
        tpl.innerHTML = wrapped + '<p><br></p>'
        const fragment = tpl.content.cloneNode(true) as DocumentFragment
        el.appendChild(fragment)
        // Persist & scroll into view
        persist()
        el.scrollTop = el.scrollHeight
        const scroller = el.closest('[data-doc-scroller]') as HTMLElement | null
        if (scroller) scroller.scrollTop = scroller.scrollHeight
        // Move caret to the new end
        el.focus()
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      },
      replaceSelectionWithHtml: (html: string): boolean => {
        const el = editableRef.current
        if (!el) return false
        // Try the live selection first, fall back to the saved range
        // (covers the case where the user clicked into the chat input and
        // collapsed the live selection).
        let range: Range | null = null
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const liveRange = sel.getRangeAt(0)
          if (el.contains(liveRange.commonAncestorContainer)) {
            range = liveRange
          }
        }
        if (!range) {
          range = savedRangeRef.current
        }
        if (!range || !el.contains(range.commonAncestorContainer)) return false
        const safe = sanitizeDocHtml(html)
        const wrapped = wrapAiInsert(safe)
        // Delete the selected content and insert the wrapped HTML at the
        // collapsed caret position.
        range.deleteContents()
        const tpl = document.createElement('template')
        tpl.innerHTML = wrapped
        const fragment = tpl.content.cloneNode(true) as DocumentFragment
        // Insert the fragment at the caret
        const lastNode = fragment.lastChild
        range.insertNode(fragment)
        // Collapse selection to right after the inserted content
        if (lastNode && sel) {
          const newRange = document.createRange()
          newRange.setStartAfter(lastNode)
          newRange.collapse(true)
          sel.removeAllRanges()
          sel.addRange(newRange)
        }
        // Clear the saved range so subsequent sends don't reuse it
        savedRangeRef.current = null
        persist()
        el.focus()
        // Notify that selection is now empty
        clearSavedSelection()
        return true
      },
      getPlainText: () => {
        const el = editableRef.current
        return el ? el.innerText : ''
      },
      getSelectionText: () => {
        const el = editableRef.current
        if (!el) return ''
        // Try live selection first
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const liveRange = sel.getRangeAt(0)
          if (el.contains(liveRange.commonAncestorContainer)) {
            return sel.toString()
          }
        }
        // Fall back to saved range
        if (savedRangeRef.current) {
          const div = document.createElement('div')
          div.appendChild(savedRangeRef.current.cloneContents())
          return div.innerText
        }
        return ''
      },
      getSelectionHtml: () => {
        const el = editableRef.current
        if (!el) return ''
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const liveRange = sel.getRangeAt(0)
          if (el.contains(liveRange.commonAncestorContainer)) {
            const div = document.createElement('div')
            div.appendChild(liveRange.cloneContents())
            return div.innerHTML
          }
        }
        if (savedRangeRef.current) {
          const div = document.createElement('div')
          div.appendChild(savedRangeRef.current.cloneContents())
          return div.innerHTML
        }
        return ''
      },
      focus: () => editableRef.current?.focus(),
    }
  }, [editorRef, persist, clearSavedSelection])

  // Auto-grow title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [docTitle])

  const toolBtn = (props: {
    onClick: () => void
    title: string
    children: React.ReactNode
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={props.onClick}
          aria-label={props.title}
        >
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-mono text-[10px] uppercase tracking-[0.06em]">
        {props.title}
      </TooltipContent>
    </Tooltip>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      {/*
        Hallmark · format toolbar
        Tight 7px buttons, hairline border-bottom, no backdrop blur.
        Mono eyebrow labels on hover (typographic, not decorative).
      */}
      <TooltipProvider delayDuration={200}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-background px-2 py-1 sm:px-3">
          {toolBtn({ title: 'Heading 1', onClick: () => exec('formatBlock', '<h1>') , children: <Heading1 className="size-3.5" /> })}
          {toolBtn({ title: 'Heading 2', onClick: () => exec('formatBlock', '<h2>'), children: <Heading2 className="size-3.5" /> })}
          {toolBtn({ title: 'Heading 3', onClick: () => exec('formatBlock', '<h3>'), children: <Heading3 className="size-3.5" /> })}
          <Separator orientation="vertical" className="mx-1 h-4 bg-border" />
          {toolBtn({ title: 'Bold (Ctrl+B)', onClick: () => exec('bold'), children: <Bold className="size-3.5" /> })}
          {toolBtn({ title: 'Italic (Ctrl+I)', onClick: () => exec('italic'), children: <Italic className="size-3.5" /> })}
          {toolBtn({ title: 'Underline (Ctrl+U)', onClick: () => exec('underline'), children: <Underline className="size-3.5" /> })}
          {toolBtn({ title: 'Strikethrough', onClick: () => exec('strikeThrough'), children: <Strikethrough className="size-3.5" /> })}
          {toolBtn({ title: 'Inline code', onClick: () => exec('formatBlock', '<pre>'), children: <Code2 className="size-3.5" /> })}
          <Separator orientation="vertical" className="mx-1 h-4 bg-border" />
          {toolBtn({ title: 'Bullet list', onClick: () => exec('insertUnorderedList'), children: <List className="size-3.5" /> })}
          {toolBtn({ title: 'Numbered list', onClick: () => exec('insertOrderedList'), children: <ListOrdered className="size-3.5" /> })}
          {toolBtn({ title: 'Quote', onClick: () => exec('formatBlock', '<blockquote>'), children: <Quote className="size-3.5" /> })}
          <Separator orientation="vertical" className="mx-1 h-4 bg-border" />
          {toolBtn({ title: 'Align left', onClick: () => exec('justifyLeft'), children: <AlignLeft className="size-3.5" /> })}
          {toolBtn({ title: 'Align center', onClick: () => exec('justifyCenter'), children: <AlignCenter className="size-3.5" /> })}
          {toolBtn({ title: 'Align right', onClick: () => exec('justifyRight'), children: <AlignRight className="size-3.5" /> })}
          {toolBtn({ title: 'Justify', onClick: () => exec('justifyFull'), children: <AlignJustify className="size-3.5" /> })}
          <Separator orientation="vertical" className="mx-1 h-4 bg-border" />
          {toolBtn({
            title: 'Clear formatting',
            onClick: () => {
              exec('removeFormat')
              exec('formatBlock', '<p>')
            },
            children: <Eraser className="size-3.5" />,
          })}
        </div>
      </TooltipProvider>

      {/*
        Hallmark · document surface
        Off-page feel: the doc sits in a slightly elevated paper-2 background
        with hairline border, max-width 720px (~65ch measure), generous padding.
      */}
      <div
        data-doc-scroller
        className="docmate-scroll flex-1 overflow-y-auto"
        style={{ scrollBehavior: 'smooth', background: 'var(--color-paper)' }}
      >
        <div className="mx-auto max-w-[720px] px-6 py-10 sm:px-10 sm:py-14">
          {/* Title — Space Grotesk 600, tight tracking */}
          <textarea
            ref={titleRef}
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Untitled document"
            rows={1}
            className="w-full resize-none border-none bg-transparent font-display text-3xl font-semibold tracking-[-0.025em] text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-4xl"
            style={{ fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif' }}
          />
          <div className="mb-8 mt-3 h-px bg-border" />

          {/* Editable doc body */}
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={persist}
            className="docmate-prose min-h-[60vh] w-full outline-none"
            data-placeholder="Start typing your document, or ask the assistant on the right to write content for you…"
          />
        </div>
      </div>
    </div>
  )
}
