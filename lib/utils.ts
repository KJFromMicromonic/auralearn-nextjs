import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get environment variable - works in both browser and Node.js
 * Next.js requires NEXT_PUBLIC_ prefix for client-side env vars
 * This function handles both VITE_ and NEXT_PUBLIC_ prefixes for compatibility
 */
export function getEnvVar(key: string, defaultValue: string = ''): string {
  // Convert VITE_ prefix to NEXT_PUBLIC_ for Next.js compatibility
  const nextKey = key.startsWith('VITE_') 
    ? `NEXT_PUBLIC_${key.replace(/^VITE_/, '')}` 
    : key;
  
  // In browser (client-side), Next.js exposes env vars via process.env.NEXT_PUBLIC_*
  // In Node.js (server-side), we can access process.env directly
  if (typeof process !== 'undefined' && process.env) {
    // Try NEXT_PUBLIC_ version first (Next.js standard for client-side)
    if (process.env[nextKey]) {
      return process.env[nextKey];
    }
    // Fallback to original key for backward compatibility
    if (process.env[key]) {
      return process.env[key];
    }
  }
  
  // In browser, also try window.__ENV__ if available (some build tools use this)
  if (typeof window !== 'undefined' && (window as { __ENV__?: Record<string, string> }).__ENV__) {
    const env = (window as unknown as { __ENV__: Record<string, string> }).__ENV__;
    if (env[nextKey]) return env[nextKey];
    if (env[key]) return env[key];
  }
  
  return defaultValue;
}