import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentDashboardService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  // Fetches name, branch, applications, and registered sessions
  getStudentFullDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/students/${id}/full-details`);
  }

  getAllInternships(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/internships/`);
  }

  getAllSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sessions/`);
  }

  getAllContests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/contests/`);
  }
}