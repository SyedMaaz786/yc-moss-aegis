export function redactSensitive(text: string): string {
  return text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\b\d{3}[- ]\d{2}[- ]\d{4}\b/g, '[REDACTED SSN]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[REDACTED CARD]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[REDACTED EMAIL]')
    .replace(/\b((?:account|routing)(?: number)?\s*(?:is|:|=)?\s*)\d{6,17}\b/gi, '$1[REDACTED]')
    .replace(/\b((?:password|passcode|pin|cvv|otp)\s*(?:is|:|=)\s*)\S+/gi, '$1[REDACTED]');
}
