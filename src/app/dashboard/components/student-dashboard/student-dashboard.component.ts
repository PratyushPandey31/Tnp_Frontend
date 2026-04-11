import { Component, OnInit } from '@angular/core';
import { StudentDashboardService } from '../../services/student-dashboard.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css'],
  standalone: false
})
export class StudentDashboardComponent implements OnInit {
  isLoading = true;
  
  // Real Data Variables
  studentData: any = null;
  recentInternships: any[] = [];
  
  // Calculated Metrics
  activeInternshipsCount = 0;
  applicationsCount = 0;
  upcomingSessionsCount = 0;
  activeContestsCount = 0;

  constructor(
    private dashboardService: StudentDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Securely extract the Student ID from the JWT token
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    const studentId = tokenPayload.id;

    // Fetch all data simultaneously
    forkJoin({
      student: this.dashboardService.getStudentFullDetails(studentId),
      internships: this.dashboardService.getAllInternships(),
      sessions: this.dashboardService.getAllSessions(),
      contests: this.dashboardService.getAllContests()
    }).subscribe({
      next: (result) => {
        this.studentData = result.student;
        this.applicationsCount = result.student.internshipApplications?.length || 0;
        
        // Filter out closed internships and grab the latest ones for the table
        const activeInternships = result.internships.filter(i => i.status !== 'CLOSED');
        this.activeInternshipsCount = activeInternships.length;
        this.recentInternships = activeInternships.slice(0, 5); // Show top 5 in table

        // Assuming future sessions are active
        this.upcomingSessionsCount = result.sessions.length; 
        this.activeContestsCount = result.contests.length;

        this.isLoading = false;
      },
      error: (err) => {
        console.error("Failed to load dashboard data", err);
        this.isLoading = false;
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    this.router.navigate(['/auth/login']);
  }
}