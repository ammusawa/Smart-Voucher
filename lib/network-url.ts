/**
 * Utility to get the network URL for the application
 * This can be used server-side to generate URLs with network IP
 */

export function getNetworkURL(): string {
  // Check if NEXT_PUBLIC_BASE_URL is set
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // In production, you should set NEXT_PUBLIC_BASE_URL
  // For development, we'll use localhost as fallback
  // The actual network IP will be shown in the console when starting the server
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * Get the base URL for client-side use
 * This reads from the environment variable set at build time
 */
export function getClientBaseURL(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  // Server-side: use environment variable or fallback
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

