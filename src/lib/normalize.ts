/** Zero-width and invisible characters used to break up flagged words so they slip past naive regex/tokenizer matching. */
const INVISIBLE_CHARS_RE = /[​‌‍⁠﻿­]/g;

/** Common leetspeak substitutions used to evade keyword-based filters. Digits are intentionally NOT touched anywhere PII patterns need to match real digit sequences (SSNs, card numbers) — this map is only ever applied ahead of phrase-based regexes, never ones that require a literal digit run. */
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
 * Cross-script homoglyphs: single Cyrillic/Greek letters that are visually
 * near-identical to a Latin letter, a classic phishing/evasion trick (NFKC
 * normalization does NOT fold these — it only handles compatibility forms
 * like full-width Latin, not other scripts entirely). This is a practical,
 * non-exhaustive table of the letters most likely to appear substituted
 * into English trigger phrases, not a full confusables-database
 * implementation (Unicode's confusables.txt / skeleton algorithm would be
 * the complete version of this).
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic
  "а": "a", // а CYRILLIC SMALL LETTER A
  "е": "e", // е CYRILLIC SMALL LETTER IE
  "о": "o", // о CYRILLIC SMALL LETTER O
  "р": "p", // р CYRILLIC SMALL LETTER ER
  "с": "c", // с CYRILLIC SMALL LETTER ES
  "у": "y", // у CYRILLIC SMALL LETTER U
  "х": "x", // х CYRILLIC SMALL LETTER HA
  "ѕ": "s", // ѕ CYRILLIC SMALL LETTER DZE
  "і": "i", // і CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
  "ј": "j", // ј CYRILLIC SMALL LETTER JE
  "һ": "h", // һ CYRILLIC SMALL LETTER SHHA
  // Greek
  "α": "a", // α GREEK SMALL LETTER ALPHA
  "ο": "o", // ο GREEK SMALL LETTER OMICRON
  "ρ": "p", // ρ GREEK SMALL LETTER RHO
  "υ": "u", // υ GREEK SMALL LETTER UPSILON
  "ι": "i", // ι GREEK SMALL LETTER IOTA
  "τ": "t", // τ GREEK SMALL LETTER TAU
  "χ": "x", // χ GREEK SMALL LETTER CHI
  "ν": "v", // ν GREEK SMALL LETTER NU
};

const HOMOGLYPH_RE = new RegExp(`[${Object.keys(HOMOGLYPH_MAP).join("")}]`, "g");

/**
 * Normalizes text before running it against the injection/jailbreak and
 * PII-disclosure *phrase* regexes, so obfuscation tricks (full-width Unicode
 * variants, cross-script homoglyphs, zero-width characters spliced into a
 * flagged word, basic leetspeak) don't trivially defeat the regex fallback —
 * the layer this project is now leaning on whenever Moss's semantic check
 * is degraded or unavailable (see guardrails.ts).
 *
 * Deliberately not used for: PII patterns that need real digit sequences
 * (SSN/card number — converting digits to letters would break those), or
 * the text sent to Moss's semantic query (that embedding model expects
 * natural language; scrambling case/digits/symbols on every message risks
 * hurting genuine semantic matching more than it helps against obfuscation
 * Moss's own semantic layer is already reasonably robust to).
 */
export function normalizeForPhraseMatching(text: string): string {
  return text
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS_RE, "")
    .toLowerCase()
    .replace(HOMOGLYPH_RE, (ch) => HOMOGLYPH_MAP[ch] ?? ch)
    .replace(LEET_RE, (ch) => LEET_MAP[ch] ?? ch);
}
