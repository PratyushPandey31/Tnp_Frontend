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
  studentId!: number;
  
  // View Controller: Unlocked sessions and resources
  currentView: 'overview' | 'internships' | 'applications' | 'sessions' | 'resources' = 'overview';

  // Data Variables
  studentData: any = null;
  allInternships: any[] = [];
  recentInternships: any[] = [];
  myApplications: any[] = []; 
  appliedJobIds: Set<number> = new Set(); 
  
  // Session Variables
  allSessions: any[] = [];
  myRegistrations: any[] = [];
  registeredSessionIds: Set<number> = new Set();
  
  // Resource & Notes Variables
  allResources: any[] = [];
  allNotes: any[] = [];
  myBranchNotes: any[] = []; // Smart filtered notes

  // Calculated Metrics
  activeInternshipsCount = 0;
  applicationsCount = 0;
  upcomingSessionsCount = 0;
  activeContestsCount = 0;

  isApplying = false; 
  isRegistering = false;

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

    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      this.studentId = tokenPayload.id;
      this.loadDashboardData();
    } catch (e) {
      console.error("Token error", e);
      this.logout();
    }
  }

  loadDashboardData(): void {
    this.isLoading = true;
    forkJoin({
      student: this.dashboardService.getStudentFullDetails(this.studentId),
      internships: this.dashboardService.getAllInternships(),
      sessions: this.dashboardService.getAllSessions(),
      contests: this.dashboardService.getAllContests(),
      resources: this.dashboardService.getAllResources(),
      notes: this.dashboardService.getAllNotes()
    }).subscribe({
      next: (result) => {
        this.studentData = result.student;
        
        // Track applications
        this.myApplications = result.student.internshipApplications || [];
        this.applicationsCount = this.myApplications.length;
        
        // Track sessions
        this.myRegistrations = result.student.sessionRegistrations || [];
        
        // Populate Internships
        this.allInternships = result.internships.filter(i => i.status !== 'CLOSED');
        this.activeInternshipsCount = this.allInternships.length;
        this.recentInternships = this.allInternships.slice(0, 5);

        // Populate Sessions
        this.allSessions = result.sessions;
        this.upcomingSessionsCount = this.allSessions.length; 

        // Populate Materials
        this.allResources = result.resources;
        this.allNotes = result.notes;

        // SMART FILTERING: Only show notes meant for ALL branches OR this student's specific branch & year
        this.myBranchNotes = this.allNotes.filter(note => 
          (note.targetBranch === 'ALL' || note.targetBranch === this.studentData.branch) &&
          (note.targetYear === 0 || note.targetYear === this.studentData.year)
        );

        this.activeContestsCount = result.contests.length;

        // Map tracked items for UI buttons
        this.mapAppliedJobs();
        this.mapRegisteredSessions();

        this.isLoading = false;
      },
      error: (err) => {
        console.error("Failed to load dashboard data", err);
        this.isLoading = false;
        if (err.status === 404 || err.status === 401) {
          alert("Your session was overwritten or expired. Please log in again.");
          this.logout();
        }
      }
    });
  }

  mapAppliedJobs() {
    this.appliedJobIds.clear();
    for (let app of this.myApplications) {
       const matchingJob = this.allInternships.find(job => 
         job.company === app.internshipCompany && job.role === app.internshipRole
       );
       if (matchingJob) {
         this.appliedJobIds.add(matchingJob.id);
       }
    }
  }

  mapRegisteredSessions() {
    this.registeredSessionIds.clear();
    for (let reg of this.myRegistrations) {
      // Matching by title since DTO doesn't expose ID
      const matchingSession = this.allSessions.find(s => s.title === reg.sessionTitle);
      if (matchingSession) {
        this.registeredSessionIds.add(matchingSession.id);
      }
    }
  }

  switchView(view: 'overview' | 'internships' | 'applications' | 'sessions' | 'resources') {
    this.currentView = view;
  }

  // --- INTERNSHIP ACTIONS ---
  hasApplied(jobId: number): boolean {
    return this.appliedJobIds.has(jobId);
  }

  applyForJob(job: any) {
    if (this.hasApplied(job.id)) return; 

    if (confirm(`Are you sure you want to apply for ${job.role} at ${job.company}?`)) {
      this.isApplying = true;
      this.dashboardService.applyForInternship(this.studentId, job.id).subscribe({
        next: (response) => {
          this.isApplying = false;
          alert("Application submitted successfully!");
          this.loadDashboardData(); 
        },
        error: (err) => {
          this.isApplying = false;
          console.error("Application failed", err);
          alert(err.error?.message || "Failed to apply. You may have already applied.");
        }
      });
    }
  }

  // --- SESSION ACTIONS ---
  hasRegistered(sessionId: number): boolean {
    return this.registeredSessionIds.has(sessionId);
  }

  registerForSession(session: any) {
    if (this.hasRegistered(session.id)) return;

    if (confirm(`Confirm your registration for: ${session.title}?`)) {
      this.isRegistering = true;
      this.dashboardService.registerForSession(this.studentId, session.id).subscribe({
        next: () => {
          this.isRegistering = false;
          alert("Successfully registered for the session!");
          this.loadDashboardData(); 
        },
        error: (err) => {
          this.isRegistering = false;
          console.error("Registration failed", err);
          alert("Failed to register. You might be already registered.");
        }
      });
    }
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