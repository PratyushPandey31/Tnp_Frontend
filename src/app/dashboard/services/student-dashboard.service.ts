import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentDashboardService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  getStudentFullDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/students/${id}/full-details`);
  }

  // --- INTERNSHIPS ---
  getAllInternships(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/internships/`);
  }

  applyForInternship(studentId: number, internshipId: number): Observable<any> {
    const payload = { studentId, internshipId };
    return this.http.post(`${this.apiUrl}/applications/`, payload);
  }

  // --- SESSIONS ---
  getAllSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sessions/`);
  }

  registerForSession(studentId: number, sessionId: number): Observable<any> {
    const payload = { studentId, sessionId };
    return this.http.post(`${this.apiUrl}/registrations/`, payload);
  }

  // --- RESOURCES & NOTES ---
  getAllResources(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/resources/`);
  }

  getAllNotes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notes/`);
  }

  // --- CONTESTS ---
  getAllContests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/contests/`);
  }
}