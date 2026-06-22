'use client'

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { FontFamily } from '@tiptap/extension-font-family'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import { STYLE_PRESETS } from '@/lib/style-presets'
import type { StylePresetId } from '@/lib/style-presets'
import {
  Scissors,
  ClipboardCopy,
  ClipboardPaste,
  Eraser,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
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
  Undo2,
  Redo2,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  Pilcrow,
  Highlighter,
  Baseline,
  Type,
} from 'lucide-react'

/**
 * WYSIWYG editor built on TipTap (ProseMirror).
 *
 * Hallmark · genre: modern-minimal · theme: cobalt
 * Page-based layout: A4-width white "pages" on a gray backdrop, with margins —
 * the classic Word "Print Layout" view that old-school corporate users expect.
 *
 * The editor exposes an imperative handle via forwardRef so the chat panel
 * can insert AI content, read/replace selections, and get plain text.
 */

export interface WysiwygSelectionInfo {
  hasSelection: boolean
  text: string
  length: number
}

export interface WysiwygEditorHandle {
  /** Insert HTML at end of doc, wrapped as an AI insert */
  insertAiHtml: (html: string) => void
  /** Replace the current selection with the given HTML (wrapped as AI insert). Returns true if a selection was replaced. */
  replaceSelectionWithHtml: (html: string) => boolean
  /** Get the plain text of the doc (for context to LLM) */
  getPlainText: () => string
  /** Get the plain text of the current selection (or '' if none). */
  getSelectionText: () => string
  /** Get the HTML of the current selection (or '' if none). */
  getSelectionHtml: () => string
  /** Focus the editor */
  focus: () => void
}

interface WysiwygEditorProps {
  /** Called whenever the in-doc selection changes. */
  onSelectionChange?: (info: WysiwygSelectionInfo) => void
  /** Called when the user picks "Send to edit" from the right-click menu. */
  onSendToEdit?: () => void
  /** Called when the user picks a style from "Rewrite as…" in the right-click menu. */
  onRewriteAs?: (presetId: StylePresetId) => void
}

/** Wrap AI-inserted content in a div with the cobalt marker class */
function wrapAiInsert(html: string): string {
  return `<div class="docmate-ai-insert" data-source="ai">${html}</div>`
}

/** Toolbar button helper — defined outside the component to avoid re-creation */
function ToolButton({
  onClick,
  title,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex size-7 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-accent-dim text-accent'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {children}
    </button>
  )
}

export const WysiwygEditor = forwardRef<WysiwygEditorHandle, WysiwygEditorProps>(
  function WysiwygEditor({ onSelectionChange, onSendToEdit, onRewriteAs }, ref) {
    const docTitle = useAppStore((s) => s.docTitle)
    const setDocTitle = useAppStore((s) => s.setDocTitle)
    const setDocHtml = useAppStore((s) => s.setDocHtml)
    const setStylePreset = useAppStore((s) => s.setStylePreset)
    const docContentRef = useRef<string>('')
    const [hasLiveSelection, setHasLiveSelection] = useState(false)
    const onSelChangeRef = useRef(onSelectionChange)
    const onSendToEditRef = useRef(onSendToEdit)
    const onRewriteAsRef = useRef(onRewriteAs)

    useEffect(() => {
      onSelChangeRef.current = onSelectionChange
      onSendToEditRef.current = onSendToEdit
      onRewriteAsRef.current = onRewriteAs
    }, [onSelectionChange, onSendToEdit, onRewriteAs])

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        FontFamily,
        Placeholder.configure({
          placeholder: 'Start typing your document, or ask the assistant on the right to write content for you…',
          emptyEditorClass: 'is-editor-empty',
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'docmate-table',
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
        Image.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: 'docmate-image',
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'docmate-link',
          },
        }),
        Subscript,
        Superscript,
      ],
      content: '',
      editorProps: {
        attributes: {
          class: 'docmate-wysiwyg-prose',
          spellcheck: 'true',
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        docContentRef.current = html
        setDocHtml(html)
      },
      onSelectionUpdate: ({ editor }) => {
        const { from, to, empty } = editor.state.selection
        const hasSel = !empty && from !== to
        setHasLiveSelection(hasSel)
        if (onSelChangeRef.current) {
          if (hasSel) {
            const text = editor.state.doc.textBetween(from, to, ' ')
            onSelChangeRef.current({
              hasSelection: true,
              text: text.slice(0, 120),
              length: text.length,
            })
          } else {
            onSelChangeRef.current({ hasSelection: false, text: '', length: 0 })
          }
        }
      },
    })

    // Load persisted content once on mount
    useEffect(() => {
      if (!editor) return
      const persisted = useAppStore.getState().docHtml
      if (persisted) {
        editor.commands.setContent(persisted, false)
        docContentRef.current = persisted
      }
    }, [editor])

    // Expose imperative API to parent
    useImperativeHandle(ref, () => ({
      insertAiHtml: (html: string) => {
        if (!editor) return
        const wrapped = wrapAiInsert(html)
        // Navigate to end of document: get the last position and insert there
        const endPos = editor.state.doc.content.size
        editor.chain().focus().insertContentAt(endPos, wrapped + '<p></p>').run()
      },
      replaceSelectionWithHtml: (html: string): boolean => {
        if (!editor) return false
        const { from, to, empty } = editor.state.selection
        if (empty) return false
        const wrapped = wrapAiInsert(html)
        editor.chain().focus().deleteRange({ from, to }).insertContent(wrapped).run()
        return true
      },
      getPlainText: () => {
        if (!editor) return ''
        return editor.getText()
      },
      getSelectionText: () => {
        if (!editor) return ''
        const { from, to, empty } = editor.state.selection
        if (empty) return ''
        return editor.state.doc.textBetween(from, to, ' ')
      },
      getSelectionHtml: () => {
        if (!editor) return ''
        const { from, to, empty } = editor.state.selection
        if (empty) return ''
        const slice = editor.state.doc.slice(from, to)
        const div = document.createElement('div')
        div.appendChild(slice.content.toDOM())
        return div.innerHTML
      },
      focus: () => editor?.commands.focus(),
    }), [editor])

    /** Insert an image via file picker → base64 */
    const insertImage = useCallback(() => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          editor?.chain().focus().setImage({ src: reader.result as string }).run()
        }
        reader.readAsDataURL(file)
      }
      input.click()
    }, [editor])

    /** Insert a link on the current selection */
    const insertLink = useCallback(() => {
      const url = window.prompt('Enter URL:')
      if (!url) return
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }, [editor])

    /** Insert a 3×3 table */
    const insertTable = useCallback(() => {
      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }, [editor])

    /** Insert a horizontal rule (page break visual) */
    const insertPageBreak = useCallback(() => {
      editor?.chain().focus().setHorizontalRule().run()
    }, [editor])

    const titleRef = useRef<HTMLTextAreaElement>(null)
    useEffect(() => {
      if (titleRef.current) {
        titleRef.current.style.height = 'auto'
        titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
      }
    }, [docTitle])

    if (!editor) return null

    return (
      <div className="flex h-full flex-col bg-background">
        {/*
          Hallmark · format toolbar
          Two rows: text formatting (top) + paragraph/insert (bottom).
          Tight 7px buttons, hairline border-bottom, no backdrop blur.
        */}
        <div className="sticky top-0 z-20 border-b border-border bg-background px-2 py-1 sm:px-3">
          {/* Row 1: undo/redo · headings · bold/italic/underline/strike/sub/super · color/highlight · font family */}
          <div className="flex flex-wrap items-center gap-0.5">
            <ToolButton title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Undo2 className="size-3.5" />
            </ToolButton>
            <ToolButton title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
              <Redo2 className="size-3.5" />
            </ToolButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolButton title="Paragraph" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')}>
              <Pilcrow className="size-3.5" />
            </ToolButton>
            <ToolButton title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
              <Heading1 className="size-3.5" />
            </ToolButton>
            <ToolButton title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
              <Heading2 className="size-3.5" />
            </ToolButton>
            <ToolButton title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
              <Heading3 className="size-3.5" />
            </ToolButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolButton title="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} disabled={!editor.can().toggleBold()}>
              <Bold className="size-3.5" />
            </ToolButton>
            <ToolButton title="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} disabled={!editor.can().toggleItalic()}>
              <Italic className="size-3.5" />
            </ToolButton>
            <ToolButton title="Underline (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
              <Underline className="size-3.5" />
            </ToolButton>
            <ToolButton title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
              <Strikethrough className="size-3.5" />
            </ToolButton>
            <ToolButton title="Subscript" onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')}>
              <SubIcon className="size-3.5" />
            </ToolButton>
            <ToolButton title="Superscript" onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')}>
              <SupIcon className="size-3.5" />
            </ToolButton>
            <ToolButton title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>
              <Code2 className="size-3.5" />
            </ToolButton>
            <div className="mx-1 h-4 w-px bg-border" />
            {/* Text color */}
            <label className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" title="Text color">
              <Baseline className="size-3.5" />
              <input
                type="color"
                className="absolute size-0 opacity-0"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              />
            </label>
            {/* Highlight */}
            <label className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" title="Highlight color">
              <Highlighter className="size-3.5" />
              <input
                type="color"
                className="absolute size-0 opacity-0"
                onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
              />
            </label>
            <div className="mx-1 h-4 w-px bg-border" />
            {/* Font family dropdown */}
            <select
              className="h-7 rounded-md border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              value={editor.getAttributes('textStyle').fontFamily || ''}
              onChange={(e) => {
                if (e.target.value) {
                  editor.chain().focus().setFontFamily(e.target.value).run()
                } else {
                  editor.chain().focus().unsetFontFamily().run()
                }
              }}
              title="Font family"
            >
              <option value="">Default</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Calibri', sans-serif">Calibri</option>
              <option value="'Cambria', serif">Cambria</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="Verdana, sans-serif">Verdana</option>
            </select>
            {/* Font size dropdown */}
            <select
              className="h-7 rounded-md border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              value={(editor.getAttributes('textStyle').fontSize as string) || ''}
              onChange={(e) => {
                // Font size requires a custom extension; for now use HTML inline
                const size = e.target.value
                if (size) {
                  editor.chain().focus().setMark('textStyle', { fontSize: size }).run()
                }
              }}
              title="Font size (visual only — exports use Word styles)"
            >
              <option value="">A</option>
              <option value="10px">10</option>
              <option value="11px">11</option>
              <option value="12px">12</option>
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="18px">18</option>
              <option value="20px">20</option>
              <option value="24px">24</option>
              <option value="28px">28</option>
              <option value="32px">32</option>
            </select>
          </div>

          {/* Row 2: alignment · lists · quote · link · image · table · page break · clear formatting */}
          <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
            <ToolButton title="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>
              <AlignLeft className="size-3.5" />
            </ToolButton>
            <ToolButton title="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>
              <AlignCenter className="size-3.5" />
            </ToolButton>
            <ToolButton title="Align right" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>
              <AlignRight className="size-3.5" />
            </ToolButton>
            <ToolButton title="Justify" onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}>
              <AlignJustify className="size-3.5" />
            </ToolButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolButton title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
              <List className="size-3.5" />
            </ToolButton>
            <ToolButton title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
              <ListOrdered className="size-3.5" />
            </ToolButton>
            <ToolButton title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
              <Quote className="size-3.5" />
            </ToolButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolButton title="Insert link" onClick={insertLink} active={editor.isActive('link')}>
              <Link2 className="size-3.5" />
            </ToolButton>
            <ToolButton title="Insert image" onClick={insertImage}>
              <ImageIcon className="size-3.5" />
            </ToolButton>
            <ToolButton title="Insert table (3×3)" onClick={insertTable}>
              <TableIcon className="size-3.5" />
            </ToolButton>
            <ToolButton title="Horizontal rule (page break)" onClick={insertPageBreak}>
              <Minus className="size-3.5" />
            </ToolButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolButton title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
              <Eraser className="size-3.5" />
            </ToolButton>
          </div>
        </div>

        {/*
          Page-based layout — A4-width white "pages" on a gray backdrop.
          Old-school corporate users expect this "Print Layout" view from Word.
        */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="docmate-scroll flex-1 overflow-y-auto"
              style={{ background: 'var(--color-paper-2)' }}
            >
              <div className="mx-auto my-6 w-full max-w-[816px] bg-paper px-4 py-12 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:px-16 sm:py-16" style={{ minHeight: '1056px' }}>
                {/* Title */}
                <textarea
                  ref={titleRef}
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Untitled document"
                  rows={1}
                  className="mb-4 w-full resize-none border-none bg-transparent font-display text-3xl font-semibold tracking-[-0.025em] text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-4xl"
                  style={{ fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif' }}
                />

                {/* Editor */}
                <EditorContent editor={editor} />
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-56 rounded-md border-border bg-popover p-1">
            <ContextMenuItem
              disabled={!hasLiveSelection}
              onSelect={() => onSendToEditRef.current?.()}
              className="gap-2 rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Scissors className="size-3.5 text-accent" />
              Send to edit
            </ContextMenuItem>

            <ContextMenuSub>
              <ContextMenuSubTrigger
                disabled={!hasLiveSelection}
                className="gap-2 rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
              >
                <Eraser className="size-3.5 text-accent" />
                Rewrite as…
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-52 rounded-md border-border bg-popover p-1">
                {STYLE_PRESETS.map((p) => (
                  <ContextMenuItem
                    key={p.id}
                    onSelect={() => onRewriteAsRef.current?.(p.id)}
                    className="flex flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 focus:bg-accent focus:text-accent-foreground"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-foreground">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {p.hint}
                    </span>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator className="my-1 bg-border" />

            <ContextMenuItem
              onSelect={() => document.execCommand('cut')}
              className="gap-2 rounded-sm px-2 py-1.5 text-[12px] text-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <Scissors className="size-3.5" />
              Cut
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">⌘X</span>
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => document.execCommand('copy')}
              className="gap-2 rounded-sm px-2 py-1.5 text-[12px] text-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <ClipboardCopy className="size-3.5" />
              Copy
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">⌘C</span>
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => document.execCommand('paste')}
              className="gap-2 rounded-sm px-2 py-1.5 text-[12px] text-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <ClipboardPaste className="size-3.5" />
              Paste
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">⌘V</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    )
  },
)
