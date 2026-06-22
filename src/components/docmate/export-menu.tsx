'use client'

import { useState, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Download,
  FileText,
  FileType2,
  FileCode2,
  FileTerminal,
  Printer,
  Loader2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import {
  exportAsDocx,
  exportAsDoc,
  exportAsHtml,
  exportAsMarkdown,
  exportAsPdf,
  exportAsText,
  importFromDocx,
} from '@/lib/export'

export function ExportMenu() {
  const [busy, setBusy] = useState<null | 'docx' | 'doc' | 'html' | 'md' | 'txt' | 'pdf' | 'import'>(null)
  const docTitle = useAppStore((s) => s.docTitle)
  const docHtml = useAppStore((s) => s.docHtml)
  const setDocHtml = useAppStore((s) => s.setDocHtml)
  const setDocTitle = useAppStore((s) => s.setDocTitle)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getBodyHtml = () => {
    return docHtml || ''
  }

  const getBodyText = () => {
    if (typeof document === 'undefined') return ''
    const el = document.querySelector('.docmate-wysiwyg-prose') as HTMLElement | null
    return el ? el.innerText : ''
  }

  const handle = async (
    kind: 'docx' | 'doc' | 'html' | 'md' | 'txt' | 'pdf',
  ) => {
    if (busy) return
    if (!docHtml.trim()) {
      toast.warning('Document is empty', {
        description: 'Add some content before exporting.',
      })
      return
    }
    setBusy(kind)
    try {
      const common = { title: docTitle, bodyHtml: getBodyHtml() }
      switch (kind) {
        case 'docx':
          await exportAsDocx(common)
          break
        case 'doc':
          exportAsDoc(common)
          break
        case 'html':
          exportAsHtml(common)
          break
        case 'md':
          exportAsMarkdown(common)
          break
        case 'txt':
          exportAsText({ title: docTitle, bodyText: getBodyText() })
          break
        case 'pdf':
          exportAsPdf(common)
          break
      }
      toast.success(`Exported as .${kind}`, {
        description:
          kind === 'pdf'
            ? 'Choose "Save as PDF" in the print dialog.'
            : 'Check your downloads folder.',
      })
    } catch (err) {
      toast.error('Export failed', {
        description: (err as Error).message,
      })
    } finally {
      setBusy(null)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (busy) return
    setBusy('import')
    try {
      const { html, title } = await importFromDocx(file)
      setDocHtml(html)
      setDocTitle(title)
      // Reload the page so the TipTap editor picks up the new content
      setTimeout(() => window.location.reload(), 500)
      toast.success('Document imported', {
        description: `${file.name} loaded successfully.`,
      })
    } catch (err) {
      toast.error('Import failed', {
        description: (err as Error).message,
      })
    } finally {
      setBusy(null)
      // Reset the input so the same file can be re-imported
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc"
        onChange={handleFileChange}
        className="hidden"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-7 rounded-md font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground hover:text-foreground hover:bg-secondary"
            disabled={!!busy}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span className="hidden sm:inline">Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-md border-border">
          <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            Download document
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onClick={() => handle('docx')}
            className="gap-2 cursor-pointer rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <FileText className="size-3.5" /> Word (.docx)
            <span className="ml-auto text-[9px] text-accent">new</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handle('doc')}
            className="gap-2 cursor-pointer rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <FileText className="size-3.5" /> Word (.doc)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handle('pdf')}
            className="gap-2 cursor-pointer rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <Printer className="size-3.5" /> PDF (print dialog)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handle('html')}
            className="gap-2 cursor-pointer rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <FileCode2 className="size-3.5" /> HTML (.html)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handle('md')}
            className="gap-2 cursor-pointer rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <FileType2 className="size-3.5" /> Markdown (.md)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handle('txt')}
            className="gap-2 cursor-pointer rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <FileTerminal className="size-3.5" /> Plain text (.txt)
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            Import
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={handleImportClick}
            className="gap-2 cursor-pointer rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <Upload className="size-3.5" /> Open Word file…
            <span className="ml-auto text-[9px] text-accent">new</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
