import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorLogService } from '../services/error-log.service';

/**
 * Catches every uncaught error anywhere in the app and reports it to the
 * backend error log (POST /api/error-log/client — public, no login
 * required, since a crash can happen before the user is even
 * authenticated) so "what was the last frontend error" is answerable
 * later, from the Error Log admin page, instead of only visible in
 * whichever DevTools console happened to be open at the time.
 *
 * Uses Injector (not constructor injection) to resolve ErrorLogService
 * lazily — ErrorHandler is instantiated very early in Angular's startup,
 * before the full HttpClient provider tree is necessarily settled.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: unknown): void {
    // Never make errors less visible during development — still log to
    // the console exactly as Angular's default handler would.
    console.error(error);

    if (error instanceof HttpErrorResponse) {
      // A failed HTTP call is not a frontend "crash" — it's already
      // visible via the request itself, and components throughout this
      // app already surface it (toasts, inline messages). Reporting it
      // here too would just duplicate every failed API call as an error.
      return;
    }

    try {
      const errorLogService = this.injector.get(ErrorLogService);
      const err = error instanceof Error ? error : new Error(String(error));
      errorLogService.reportClientError(err.message || 'Unknown error', err.stack ?? null, window.location.href);
    } catch {
      // Reporting the error must never itself throw back into the
      // handler that's already dealing with one.
    }
  }
}
