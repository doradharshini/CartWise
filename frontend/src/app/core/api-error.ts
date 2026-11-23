import { HttpErrorResponse } from '@angular/common/http';

/**
 * Equivalent of the React pattern `data.message || fallback` after a failed fetch.
 * HttpClient puts the parsed JSON body of an error response on `err.error`.
 */
export function apiErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object' && body.message) return body.message;
    if (typeof body === 'string' && body.trim()) return body;
    if (err.status === 0) return 'Cannot reach the server. Please check your connection.';
  }
  return err?.message || fallback;
}
