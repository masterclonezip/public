/**
 * Ultra-lean critical inline CSS (~1.2 KB) injected into <head> on every SSR response.
 * Works alongside Vite's synchronous <link rel="stylesheet" href="/assets/index-*.css"> in <head>
 * to guarantee zero Flash of Unstyled Content (FOUC) and zero dark/light theme flash without
 * bloating every HTML document with 300KB of duplicate un-cached CSS rules.
 */
const CRITICAL_SHELL_CSS = `<style id="server-critical-css">
*,::before,::after{box-sizing:border-box;border:0 solid}
html{-webkit-text-size-adjust:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased;background-color:#f8fafc;color:#0f172a}
html.dark{background-color:#09090b;color:#f4f4f5;color-scheme:dark}
body{margin:0;min-height:100vh;background-color:inherit;color:inherit;overflow-x:hidden}
#root{min-height:100vh;display:flex;flex-direction:column}
main#main-content{flex:1 1 0%;width:100%;max-width:80rem;margin-left:auto;margin-right:auto}
img,svg,video{display:block;max-width:100%;height:auto}
a{color:inherit;text-decoration:inherit}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
.no-scrollbar::-webkit-scrollbar{display:none}
.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
</style>`;

export function getCriticalCss(): string {
  return CRITICAL_SHELL_CSS;
}

export function clearCriticalCssCache(): void {
  // No-op: critical shell is static and deterministic
}

