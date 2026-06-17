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
}

export interface DocEditorHandle {
  /** Insert HTML at end of doc, wrapped as an AI insert */
  insertAiHtml: (html: string) => void
  /** Get the plain text of the doc (for context to LLM) */
  getPlainText: () => string
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

export function DocEditor({ editorRef }: DocEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const docHtml = useAppStore((s) => s.docHtml)
  const docTitle = useAppStore((s) => s.docTitle)
  const setDocHtml = useAppStore((s) => s.setDocHtml)
  const setDocTitle = useAppStore((s) => s.setDocTitle)

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
      getPlainText: () => {
        const el = editableRef.current
        return el ? el.innerText : ''
      },
      focus: () => editableRef.current?.focus(),
    }
  }, [editorRef, persist])

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
          className="size-8"
          onClick={props.onClick}
          aria-label={props.title}
        >
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {props.title}
      </TooltipContent>
    </Tooltip>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Format toolbar */}
      <TooltipProvider delayDuration={200}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-background/95 px-2 py-1.5 backdrop-blur">
          {toolBtn({ title: 'Heading 1', onClick: () => exec('formatBlock', '<h1>') , children: <Heading1 className="size-4" /> })}
          {toolBtn({ title: 'Heading 2', onClick: () => exec('formatBlock', '<h2>'), children: <Heading2 className="size-4" /> })}
          {toolBtn({ title: 'Heading 3', onClick: () => exec('formatBlock', '<h3>'), children: <Heading3 className="size-4" /> })}
          <Separator orientation="vertical" className="mx-1 h-6" />
          {toolBtn({ title: 'Bold (Ctrl+B)', onClick: () => exec('bold'), children: <Bold className="size-4" /> })}
          {toolBtn({ title: 'Italic (Ctrl+I)', onClick: () => exec('italic'), children: <Italic className="size-4" /> })}
          {toolBtn({ title: 'Underline (Ctrl+U)', onClick: () => exec('underline'), children: <Underline className="size-4" /> })}
          {toolBtn({ title: 'Strikethrough', onClick: () => exec('strikeThrough'), children: <Strikethrough className="size-4" /> })}
          {toolBtn({ title: 'Inline code', onClick: () => exec('formatBlock', '<pre>'), children: <Code2 className="size-4" /> })}
          <Separator orientation="vertical" className="mx-1 h-6" />
          {toolBtn({ title: 'Bullet list', onClick: () => exec('insertUnorderedList'), children: <List className="size-4" /> })}
          {toolBtn({ title: 'Numbered list', onClick: () => exec('insertOrderedList'), children: <ListOrdered className="size-4" /> })}
          {toolBtn({ title: 'Quote', onClick: () => exec('formatBlock', '<blockquote>'), children: <Quote className="size-4" /> })}
          <Separator orientation="vertical" className="mx-1 h-6" />
          {toolBtn({ title: 'Align left', onClick: () => exec('justifyLeft'), children: <AlignLeft className="size-4" /> })}
          {toolBtn({ title: 'Align center', onClick: () => exec('justifyCenter'), children: <AlignCenter className="size-4" /> })}
          {toolBtn({ title: 'Align right', onClick: () => exec('justifyRight'), children: <AlignRight className="size-4" /> })}
          {toolBtn({ title: 'Justify', onClick: () => exec('justifyFull'), children: <AlignJustify className="size-4" /> })}
          <Separator orientation="vertical" className="mx-1 h-6" />
          {toolBtn({
            title: 'Clear formatting',
            onClick: () => {
              exec('removeFormat')
              exec('formatBlock', '<p>')
            },
            children: <Eraser className="size-4" />,
          })}
        </div>
      </TooltipProvider>

      {/* Scrollable document surface */}
      <div
        data-doc-scroller
        className="flex-1 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="mx-auto my-8 max-w-3xl px-8">
          {/* Title */}
          <textarea
            ref={titleRef}
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Untitled document"
            rows={1}
            className="w-full resize-none border-none bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
          />
          <div className="mb-6 mt-2 h-px bg-border" />

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
