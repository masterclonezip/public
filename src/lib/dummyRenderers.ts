/**
 * Dummy renderers fallback module for build resilience across split repos
 */

export function escapeHtml(str: string): string { return str || ''; }
export function sanitizeHtml(str: string): string { return str || ''; }

export function renderHeader(..._args: any[]): string { return ''; }
export function renderFooter(..._args: any[]): string { return ''; }
export function renderHome(..._args: any[]): string { return ''; }
export function renderNewApps(..._args: any[]): string { return ''; }
export function renderCategoriesList(..._args: any[]): string { return ''; }
export function renderCategory(..._args: any[]): string { return ''; }
export function renderNewsList(..._args: any[]): string { return ''; }
export function renderNewsDetail(..._args: any[]): string { return ''; }
export function renderVideosList(..._args: any[]): string { return ''; }
export function renderVideoDetail(..._args: any[]): string { return ''; }
export function renderAbout(..._args: any[]): string { return ''; }
export function renderContact(..._args: any[]): string { return ''; }
export function renderPrivacy(..._args: any[]): string { return ''; }
export function renderTerms(..._args: any[]): string { return ''; }
export function renderResponsibility(..._args: any[]): string { return ''; }
export function renderReportRemoval(..._args: any[]): string { return ''; }
export function renderNotice(..._args: any[]): string { return ''; }
export function renderEthics(..._args: any[]): string { return ''; }
export function renderDisclaimer(..._args: any[]): string { return ''; }
export function renderDevelopersList(..._args: any[]): string { return ''; }
export function renderFaqPage(..._args: any[]): string { return ''; }
export function renderGateway(..._args: any[]): string { return ''; }
export function renderAppDetails(..._args: any[]): string { return ''; }
export function render404(..._args: any[]): string { return ''; }
