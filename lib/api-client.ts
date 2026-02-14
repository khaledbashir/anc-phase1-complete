/**
 * API Client with RBAC error handling
 *
 * Wraps fetch to gracefully handle 403 Forbidden responses
 * Shows user-friendly toast notifications when access is denied
 */

import { toast } from "@/components/ui/use-toast";

/**
 * Enhanced fetch that handles 403 Forbidden responses
 *
 * @example
 * ```ts
 * const response = await apiFetch('/api/products', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 * ```
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, init);

    // Handle 403 Forbidden - user lacks permission
    if (response.status === 403) {
      // Clone response to read body without consuming it
      const clone = response.clone();
      let errorMessage = "You don't have permission to do this. Contact your admin.";

      try {
        const errorData = await clone.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If response body is not JSON, use default message
      }

      toast({
        variant: "destructive",
        title: "Access Denied",
        description: errorMessage,
      });

      // Still return the response so caller can handle it
      return response;
    }

    return response;
  } catch (error) {
    // Network error or other fetch failure
    throw error;
  }
}

/**
 * Helper to check if a response indicates lack of permission
 */
export function isForbidden(response: Response): boolean {
  return response.status === 403;
}

/**
 * Helper to show permission denied toast manually
 */
export function showPermissionDeniedToast(customMessage?: string) {
  toast({
    variant: "destructive",
    title: "Access Denied",
    description:
      customMessage || "You don't have permission to do this. Contact your admin.",
  });
}
