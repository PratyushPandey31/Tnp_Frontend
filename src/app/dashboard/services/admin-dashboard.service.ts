import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  getAdminFullDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/admins/${id}/full-details`);
  }

  getAllStudents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/students/`);
  }

  getAllInternships(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/internships/`);
  }

  getPendingAdmins(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admins/pending-requests`);
  }

  // The endpoint we created to approve admins!
  approveAdmin(id: number): Observable<any> {
    // Passing an empty body {} because it's a PATCH request that just changes status
    return this.http.patch(`${this.apiUrl}/admins/${id}/approve`, {}, { responseType: 'text' }); 
  }
}