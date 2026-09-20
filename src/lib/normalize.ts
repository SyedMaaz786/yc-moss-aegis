/** Zero-width and invisible characters used to break up flagged words so they slip past naive regex/tokenizer matching. */
const INVISIBLE_CHARS_RE = /[​‌‍⁠﻿­]/g;

/** Common leetspeak substitutions used to evade keyword-based filters. Digits are intentionally NOT touched anywhere PII patterns need to match real digit sequences (SSNs, card numbers) — this map is only ever applied ahead of the injection-phrase regexes, never the PII ones. */
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

// None of these characters need escaping inside a character class (no ] \ ^ or - present),
// and backslash-escaping digits here would be actively wrong: inside [...], \0/\1/\3 etc.
// are control-character escapes (NUL, SOH, ETX, ...), not literal digits.
const LEET_RE = new RegExp(`[${Object.keys(LEET_MAP).join("")}]`, "g");

/**
 * Normalizes text before running it against the injection/jailbreak phrase
 * regexes, so obfuscation tricks (full-width Unicode variants, zero-width
 * characters spliced into a flagged word, basic leetspeak) don't trivially
 * defeat the regex fallback — the layer this project is now leaning on
 * whenever Moss's semantic check is unavailable (see guardrails.ts).
 *
 * Deliberately does NOT touch the raw message used for PII digit patterns
 * (SSN/card number) — converting digits to letters would break those.
 */
export function normalizeForPhraseMatching(text: string): string {
  return text
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS_RE, "")
    .toLowerCase()
    .replace(LEET_RE, (ch) => LEET_MAP[ch] ?? ch);
}
