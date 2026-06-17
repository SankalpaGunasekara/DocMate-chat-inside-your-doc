'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import {
  exportAsDocx,
  exportAsHtml,
  exportAsMarkdown,
  exportAsPdf,
  exportAsText,
} from '@/lib/export'

export function ExportMenu() {
  const [busy, setBusy] = useState<null | 'doc' | 'html' | 'md' | 'txt' | 'pdf'>(null)
  const docTitle = useAppStore((s) => s.docTitle)
  const docHtml = useAppStore((s) => s.docHtml)

  const getBodyHtml = () => {
    // Strip AI-insert wrapper <section> tags so they render as plain content
    return docHtml || ''
  }

  const getBodyText = () => {
    if (typeof document === 'undefined') return ''
    const el = document.querySelector('.docmate-prose') as HTMLElement | null
    return el ? el.innerText : ''
  }

  const handle = (
    kind: 'doc' | 'html' | 'md' | 'txt' | 'pdf',
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
        case 'doc':
          exportAsDocx(common)
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={!!busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Download document
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handle('doc')} className="gap-2 cursor-pointer">
          <FileText className="size-4" /> Word (.doc)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('pdf')} className="gap-2 cursor-pointer">
          <Printer className="size-4" /> PDF (print dialog)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('html')} className="gap-2 cursor-pointer">
          <FileCode2 className="size-4" /> HTML (.html)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('md')} className="gap-2 cursor-pointer">
          <FileType2 className="size-4" /> Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('txt')} className="gap-2 cursor-pointer">
          <FileTerminal className="size-4" /> Plain text (.txt)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
