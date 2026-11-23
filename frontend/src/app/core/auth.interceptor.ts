import {
  HttpClient,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Port of the global fetch interceptor in AuthContext.jsx:
 *  - attaches the bearer token to API calls
 *  - on 401 (except login/refresh) refreshes the token ONCE; concurrent
 *    requests wait for the new token, then retry.
 */
let isRefreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

const withToken = (req: HttpRequest<any>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const http = inject(HttpClient);

  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const isAuthCall = req.url.includes('/login') || req.url.includes('/refresh');
  const request = isAuthCall || req.headers.has('Authorization') ? req : withToken(req, auth.accessToken);

  return next(request).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isAuthCall) {
        return throwError(() => err);
      }
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        auth.logout();
        return throwError(() => err);
      }
      return handle401(req, next, auth, http, refreshToken, err);
    }),
  );
};

function handle401(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  auth: AuthService,
  http: HttpClient,
  refreshToken: string,
  original: HttpErrorResponse,
): Observable<any> {
  if (isRefreshing) {
    return refreshed$.pipe(
      filter((t) => t !== null),
      take(1),
      switchMap((t) => next(withToken(req, t))),
    );
  }
  isRefreshing = true;
  refreshed$.next(null);
  return http.post<any>(`${environment.apiUrl}/users/refresh`, { refreshToken }).pipe(
    switchMap((data) => {
      isRefreshing = false;
      auth.setTokens(data.accessToken, data.refreshToken);
      refreshed$.next(data.accessToken);
      return next(withToken(req, data.accessToken));
    }),
    catchError(() => {
      isRefreshing = false;
      auth.logout();
      return throwError(() => original);
    }),
  );
}
