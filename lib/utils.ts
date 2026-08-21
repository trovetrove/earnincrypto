import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// JSON-LD is injected via dangerouslySetInnerHTML, so any "<" in the data
// (a title containing "</script>", for instance) would otherwise close the
// script tag early and let the rest execute as markup.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
