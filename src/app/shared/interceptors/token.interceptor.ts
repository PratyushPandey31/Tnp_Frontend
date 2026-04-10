import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { skipTokenUrls } from '../utils/urlList';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    
    // 1. Check if the URL should be skipped (e.g., Login/Register)
    const isWhitelisted = skipTokenUrls.some(url => request.url.includes(url));

    if (isWhitelisted) {
      return next.handle(request);
    }

    // 2. Fetch the token from localStorage
    const token = localStorage.getItem('token');

    // 3. Clone the request and inject the Bearer token
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // 4. Send the request and handle potential 401 (Unauthorized) errors globally
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token is expired or invalid. Clear storage and force re-login.
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          this.router.navigate(['/']); // Redirecting to landing page
        }
        return throwError(() => error);
      })
    );
  }
}