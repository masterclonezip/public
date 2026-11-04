import fs from 'fs';
import path from 'path';

/**
 * Critical inline CSS injected into <head> on every SSR response.
 * When serving dynamic SSR (where Vite's CSS hasn't already been inlined into #vite-inline-css),
 * this also embeds the compiled production CSS bundle from dist/assets/*.css so HTML and CSS
 * always arrive together in a single payload with zero FOUC or layout shift.
 */
const CRITICAL_SHELL_RULES = `
@layer base {
  *,::before,::after{box-sizing:border-box;border:0 solid}
  html{-webkit-text-size-adjust:100%;text-size-adjust:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased;background-color:#ffffff;color:#09090b;color-scheme:light}
  @media (max-width:639px){html{font-size:14.5px}}
  @media (max-width:400px){html{font-size:13.75px}}
  @media (max-width:359px){html{font-size:12.75px}}
  @media (prefers-color-scheme:dark){html:not(.light){background-color:#090d16;color:#f8fafc;color-scheme:dark}}
  html.dark,html[data-theme="dark"]{background-color:#090d16;color:#f8fafc;color-scheme:dark}
  body{margin:0;min-height:100vh;background-color:inherit;color:inherit;overflow-x:hidden}
  img,svg,video{display:block;max-width:100%;height:auto}
  a{color:inherit;text-decoration:inherit}
}
#root{min-height:100vh;display:flex;flex-direction:column}
main#main-content{flex:1 1 0%;width:100%;max-width:80rem;margin-left:auto;margin-right:auto}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
.no-scrollbar::-webkit-scrollbar{display:none}
.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
`;

const CRITICAL_SHELL_CSS = `<style id="server-critical-css">${CRITICAL_SHELL_RULES}</style>`;

let cachedFullCriticalCss: string | null = null;

export function getCriticalCss(hasInlinedViteCss = false): string {
  if (hasInlinedViteCss) {
    return CRITICAL_SHELL_CSS;
  }
  if (cachedFullCriticalCss !== null) {
    return cachedFullCriticalCss;
  }
  try {
    const assetsDir = path.resolve(process.cwd(), 'dist', 'assets');
    if (fs.existsSync(assetsDir)) {
      const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
      if (cssFiles.length > 0) {
        const combinedCss = cssFiles
          .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
          .join('\n');
        if (combinedCss.trim()) {
          cachedFullCriticalCss = `<style id="server-critical-css">${combinedCss}\n${CRITICAL_SHELL_RULES}</style>`;
          return cachedFullCriticalCss;
        }
      }
    }
  } catch (_) {}
  return CRITICAL_SHELL_CSS;
}

export function clearCriticalCssCache(): void {
  cachedFullCriticalCss = null;
}

