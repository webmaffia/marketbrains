/** Real company logo for a domain, via a free domain-to-icon lookup. UI falls back to a generated badge if it 404s. */
export function logoUrl(domain: string): string {
  return `https://icon.horse/icon/${domain}`;
}
