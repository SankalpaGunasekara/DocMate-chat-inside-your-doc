'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/app-store'
import { STYLE_PRESETS, getPreset, type StylePresetId } from '@/lib/style-presets'

/**
 * Hallmark · style preset selector
 * Mono uppercase trigger, cobalt square glyph, hint text under each option.
 * Sits beside the provider switcher in the chat panel header.
 */
export function StylePresetSelect() {
  const stylePreset = useAppStore((s) => s.stylePreset)
  const setStylePreset = useAppStore((s) => s.setStylePreset)
  const current = getPreset(stylePreset)

  return (
    <Select
      value={stylePreset}
      onValueChange={(v) => setStylePreset(v as StylePresetId)}
    >
      <SelectTrigger
        className="h-7 flex-1 rounded-md border-border bg-background font-mono text-[11px] uppercase tracking-[0.04em]"
        aria-label="Writing style"
      >
        <span
          className="mr-1 inline-block size-1.5 rounded-[1px] bg-accent align-middle"
          aria-hidden
        />
        <SelectValue>{current.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            Writing style
          </SelectLabel>
          {STYLE_PRESETS.map((p) => (
            <SelectItem
              key={p.id}
              value={p.id}
              className="flex items-start gap-2 py-1.5"
            >
              <div className="flex flex-col">
                <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-foreground">
                  {p.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {p.hint}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
