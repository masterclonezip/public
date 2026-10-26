/**
 * Gateway SSR Shell Renderer (§5.10)
 * Returns a blank, link-free shell for /moreinfo/* and /gateway/* routes so link-preview
 * fetchers and non-compliant crawlers receive zero links, zero lock icons, and zero references to other pages.
 */
export function renderGateway(_slug: string, _settings?: any, _apps: any[] = []): string {
  return '';
}
