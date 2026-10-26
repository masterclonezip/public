/**
 * Utility functions for Application Hub
 * Includes CSS class merging and admin route path resolution securely.
 */

export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function safeVibrate(pattern: number | number[]): void {
  try {
    if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
      setTimeout(() => {
        try {
          window.navigator.vibrate(pattern);
        } catch (e) {}
      }, 0);
    }
  } catch (e) {
    // Catch security or iframe guest gesture exceptions silently
  }
}

export function getAdminPath(): string {
  let envPath = null;
  if (typeof process !== 'undefined') {
    envPath = process.env?.ADMIN_PATH || process.env?.VITE_ADMIN_PATH;
  }
  
  // Also check import.meta.env for Vite browser-side compatibility
  try {
    // @ts-ignore - process might not be defined in all environments
    const viteEnvPath = import.meta.env?.VITE_ADMIN_PATH;
    if (viteEnvPath) envPath = viteEnvPath;
  } catch (e) {
    // ignore
  }

  return envPath || "admin";
}
