/**
 * Hallmark · DocMate style presets
 *
 * Each preset augments the base system prompt with tone + structure instructions.
 * The user picks one from the chat panel; it applies to both append-mode and
 * selection-edit-mode sends. Presets are stored by id in the Zustand store.
 *
 * Keep the instructions SHORT and OPINIONATED. The base system prompt already
 * covers markdown formatting; presets only steer voice, register, and shape.
 */

export type StylePresetId =
  | 'default'
  | 'academic'
  | 'daily'
  | 'technical'
  | 'marketing'
  | 'journalistic'
  | 'formal'
  | 'poetic'
  | 'concise'

export interface StylePreset {
  id: StylePresetId
  label: string
  /** Short description shown under the label in the dropdown */
  hint: string
  /** Glyph rendered in the dropdown trigger (emoji-free — typographic only) */
  glyph: string
  /** The instruction text appended to the system prompt when this preset is active */
  prompt: string
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'default',
    label: 'Default',
    hint: 'Balanced, clear, no special register',
    glyph: '·',
    prompt: '',
  },
  {
    id: 'academic',
    label: 'Academic',
    hint: 'Third person, hedged claims, citations suggested',
    glyph: 'A',
    prompt: `Write in an academic register.
- Use third person and the passive voice where appropriate ("It is argued that…", "The data suggest…").
- Hedge claims with qualifiers ("tends to", "may indicate", "is associated with") unless the user has supplied a fact.
- Prefer precise terminology; define any term on first use.
- Structure with explicit signposting ("First,…", "By contrast,…", "In summary,…").
- If the user has not supplied a source for a factual claim, append "(source to confirm)" rather than inventing a citation.`,
  },
  {
    id: 'daily',
    label: 'Daily',
    hint: 'First person, conversational, contractions OK',
    glyph: 'd',
    prompt: `Write in an everyday conversational register.
- Use first person ("I", "we") and contractions ("don't", "you're").
- Short sentences. Plain words. No jargon.
- If the topic is light, the prose can be warm — but never twee.
- Skip preamble like "Sure!" or "Here's…". Just write the content.`,
  },
  {
    id: 'technical',
    label: 'Technical',
    hint: 'Imperative, exact, code-aware',
    glyph: 'T',
    prompt: `Write in a technical engineering register.
- Imperative voice for instructions ("Set the variable to…", "Run the command…").
- Use exact identifiers, types, and version numbers when known.
- Code blocks must carry a language tag.
- No marketing language. No "powerful", "seamless", "robust".
- If a step is risky or destructive, prefix it with **Warning:** in bold.`,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    hint: 'Benefit-led, scannable, CTA-aware',
    glyph: 'M',
    prompt: `Write in a marketing copy register.
- Lead with the benefit, not the feature.
- Use short paragraphs (1–3 sentences) and frequent sub-headings.
- Bullet lists for feature cadence; each bullet starts with a verb.
- One CTA per section, written as a short imperative ("Start free", "Book a demo").
- No invented metrics. If a number is needed and the user hasn't supplied one, write "(metric to confirm)".
- Banned words: seamless, robust, leverage, empower, game-changing, revolutionize.`,
  },
  {
    id: 'journalistic',
    label: 'Journalistic',
    hint: 'Inverted pyramid, AP style, attributed',
    glyph: 'J',
    prompt: `Write in a journalistic register (AP / Reuters school).
- Inverted pyramid: the lead paragraph answers Who / What / When / Where / Why.
- Past tense for events, present tense for ongoing states.
- Attribute every claim to a source ("according to…", "the report finds…").
- Short sentences. One idea per sentence. No subordinate clauses longer than 12 words.
- Numbers under 10 are spelled out; 10 and above are numerals.
- No opinions in the body; if needed, mark them as analysis.`,
  },
  {
    id: 'formal',
    label: 'Formal',
    hint: 'Polite, no contractions, structured',
    glyph: 'F',
    prompt: `Write in a formal business register.
- No contractions. No colloquialisms. No exclamation marks.
- Use "I" or "we" sparingly; prefer the third person or passive.
- Open with a one-sentence statement of purpose.
- Close with a clear next step ("I look forward to your reply", "Please review the attached").
- Headings are short noun phrases, not sentences.`,
  },
  {
    id: 'poetic',
    label: 'Poetic',
    hint: 'Image-led, rhythmic, sparing on abstraction',
    glyph: 'P',
    prompt: `Write in a lyrical, image-led register.
- Lead with concrete sensory imagery; let the abstraction arrive second.
- Vary sentence rhythm — one short, one long, one short.
- Use metaphors sparingly and only when they earn their keep.
- No clichés ("dance like a butterfly", "whisper of the wind"). If a metaphor feels familiar, cut it.
- Line breaks matter; use them deliberately.`,
  },
  {
    id: 'concise',
    label: 'Concise',
    hint: 'Telegraphic, half the words, no filler',
    glyph: 'c',
    prompt: `Write in a maximally concise register.
- Cut every word that isn't load-bearing.
- No preamble. No "Here is…". No "In this section…".
- Prefer fragments over full sentences where the meaning survives.
- Bullet points beat prose wherever possible.
- If a sentence is longer than 20 words, split it or delete it.`,
  },
]

export const DEFAULT_PRESET: StylePreset = STYLE_PRESETS[0]

export function getPreset(id: StylePresetId): StylePreset {
  return STYLE_PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET
}
