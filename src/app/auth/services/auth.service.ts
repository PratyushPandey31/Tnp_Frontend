import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ILogin } from '../models/ilogin';
import { IRegister } from '../models/iregister';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  // ==========================================
  // STUDENT APIS
  // ==========================================

  registerStudent(userData: IRegister): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/`, userData);
  }

  loginStudent(credentials: ILogin): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/login`, credentials).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('userRole', 'STUDENT');
        }
      })
    );
  }

  // ==========================================
  // ADMIN APIS
  // ==========================================

  // Note: Using 'any' for adminData until you create an IAdminRegister interface
  registerAdmin(adminData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins/register`, adminData);
  }

  loginAdmin(credentials: ILogin): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins/login`, credentials).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('userRole', 'ADMIN');
        }
      })
    );
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}