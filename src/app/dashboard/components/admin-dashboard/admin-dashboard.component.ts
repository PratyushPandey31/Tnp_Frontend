import { Component, OnInit } from '@angular/core';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  isLoading = true;
  adminData: any = null;
  adminId!: number;

  // View Controller: Added 'sessions'
  currentView: 'overview' | 'internships' | 'resources' | 'students' | 'sessions' = 'overview';

  // Security Flags
  isSuperAdmin = false;
  readonly SUPER_ADMIN_EMAIL = 'engineerindmind1209@gmail.com';

  // Metrics & Data Collections
  totalStudents = 0;
  activeInternshipsCount = 0;
  pendingApprovalsCount = 0;
  totalSessions = 0;

  pendingAdmins: any[] = [];
  allInternships: any[] = [];
  allResources: any[] = [];
  allNotes: any[] = [];
  allSessions: any[] = [];

  // Student Management
  allStudents: any[] = [];
  filteredStudents: any[] = [];
  selectedStudentId: number | null = null;
  selectedStudent: any = null;
  isFetchingStudentProfile = false;

  avgCgpa: string = '0.00';
  branchStats: any[] = [];
  searchQuery = '';
  filterBranch = '';
  filterYear = '';

  // Internship View
  currentInternshipName = '';
  selectedInternshipId: number | null = null;
  applicantsList: any[] = [];
  isFetchingApplicants = false;

  // Session View
  currentSessionName = '';
  selectedSessionId: number | null = null;
  sessionRegistrations: any[] = [];
  sessionBranchStats: {branch: string, count: number}[] = [];
  isFetchingSessionRegistrations = false;

  // Forms
  internshipForm!: FormGroup;
  resourceForm!: FormGroup;
  noteForm!: FormGroup;
  sessionForm!: FormGroup;

  // Files for Upload
  selectedNoteFile: File | null = null;
  selectedResourceFile: File | null = null;

  // Form Toggles
  showInternshipForm = false;
  showResourceForm = false;
  showNoteForm = false;
  showSessionForm = false;

  isPostingJob = false;
  isPostingMaterial = false;
  isPostingSession = false;

  constructor(
    private dashboardService: AdminDashboardService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      this.adminId = tokenPayload.id;
      const userEmail = tokenPayload.sub;

      this.isSuperAdmin = (userEmail === this.SUPER_ADMIN_EMAIL);

      this.internshipForm = this.fb.group({
        role: ['', Validators.required],
        company: ['', Validators.required],
        stipend: ['', Validators.required],
        eligibility: ['', Validators.required],
        deadline: ['', Validators.required],
        description: ['', Validators.required],
        status: ['OPEN']
      });

      this.resourceForm = this.fb.group({
        title: ['', Validators.required],
        type: ['Link', Validators.required],
        description: ['', Validators.required],
        fileUrl: [''] 
      });

      this.noteForm = this.fb.group({
        title: ['', Validators.required],
        targetBranch: ['COMP', Validators.required],
        targetYear: [3, Validators.required],
        description: ['', Validators.required]
      });

      this.sessionForm = this.fb.group({
        title: ['', Validators.required],
        speaker: ['', Validators.required],
        sessionDatetime: ['', Validators.required],
        targetBranch: ['ALL', Validators.required],
        targetYear: [0, Validators.required], // 0 can mean ALL
        joinUrl: ['', Validators.required], // Used for Zoom link or Physical Venue
        description: ['', Validators.required]
      });

      this.loadDashboardData();
    } catch (error) {
      console.error("Error parsing JWT token", error);
      this.logout();
    }
  }

  loadDashboardData() {
    this.isLoading = true;
    forkJoin({
      admin: this.dashboardService.getAdminFullDetails(this.adminId),
      students: this.dashboardService.getAllStudents(),
      internships: this.dashboardService.getAllInternships(),
      pending: this.dashboardService.getPendingAdmins(),
      resources: this.dashboardService.getAllResources(),
      notes: this.dashboardService.getAllNotes(),
      sessions: this.dashboardService.getAllSessions()
    }).subscribe({
      next: (result) => {
        this.adminData = result.admin;
        this.totalSessions = result.sessions.length;
        this.totalStudents = result.students.length;

        this.allInternships = result.internships;
        this.activeInternshipsCount = this.allInternships.filter(i => i.status !== 'CLOSED').length;

        this.pendingAdmins = result.pending;
        this.pendingApprovalsCount = this.pendingAdmins.length;

        this.allResources = result.resources;
        this.allNotes = result.notes;
        this.allSessions = result.sessions;

        this.allStudents = result.students;
        this.filteredStudents = [...this.allStudents];
        this.calculateStudentStats();

        this.isLoading = false;
      },
      error: (err) => {
        console.error("Failed to load admin dashboard", err);
        this.isLoading = false;
      }
    });
  }

  switchView(view: 'overview' | 'internships' | 'resources' | 'students' | 'sessions') {
    this.currentView = view;
    
    this.showInternshipForm = false;
    this.showResourceForm = false;
    this.showNoteForm = false;
    this.showSessionForm = false;
    
    this.selectedInternshipId = null;
    this.selectedStudentId = null; 
    this.selectedSessionId = null;
    
    this.selectedNoteFile = null;
    this.selectedResourceFile = null;
  }

  // ==========================================
  // SESSIONS LOGIC
  // ==========================================
  toggleSessionForm() {
    this.showSessionForm = !this.showSessionForm;
    if (!this.showSessionForm) {
      this.sessionForm.reset({ targetBranch: 'ALL', targetYear: 0 });
    }
  }

  submitSession() {
    if (this.sessionForm.valid) {
      this.isPostingSession = true;
      const payload = {
        ...this.sessionForm.value,
        createdByAdminId: this.adminId
      };

      this.dashboardService.createSession(payload).subscribe({
        next: () => {
          this.isPostingSession = false;
          this.toggleSessionForm();
          this.loadDashboardData();
          alert("Session Scheduled Successfully!");
        },
        error: (err) => {
          this.isPostingSession = false;
          alert("Failed to schedule session.");
          console.error(err);
        }
      });
    } else {
      this.sessionForm.markAllAsTouched();
    }
  }

  deleteSession(id: number) {
    if(confirm("Are you sure you want to cancel this session?")) {
      this.dashboardService.deleteSession(id).subscribe({
        next: () => {
          this.allSessions = this.allSessions.filter(s => s.id !== id);
          this.totalSessions = this.allSessions.length;
        },
        error: () => alert("Failed to cancel session.")
      });
    }
  }

  viewSessionRegistrations(session: any) {
    this.isFetchingSessionRegistrations = true;
    this.selectedSessionId = session.id;
    this.currentSessionName = session.title;

    this.dashboardService.getSessionRegistrations(session.id).subscribe({
      next: (data) => {
        this.sessionRegistrations = data;
        this.calculateSessionBranchStats();
        this.isFetchingSessionRegistrations = false;
      },
      error: (err) => {
        console.error("Error fetching session registrations", err);
        this.isFetchingSessionRegistrations = false;
        alert("Could not load registrations.");
      }
    });
  }

  calculateSessionBranchStats() {
    const counts: any = {};
    this.sessionRegistrations.forEach(reg => {
      const branch = reg.studentBranch || 'Unknown';
      counts[branch] = (counts[branch] || 0) + 1;
    });

    this.sessionBranchStats = Object.keys(counts).map(b => ({
      branch: b,
      count: counts[b]
    })).sort((a, b) => b.count - a.count);
  }

  closeSessionRegistrations() {
    this.selectedSessionId = null;
    this.sessionRegistrations = [];
  }

  // ==========================================
  // RESOURCES & NOTES (WITH FILE UPLOAD)
  // ==========================================
  toggleResourceForm() {
    this.showResourceForm = !this.showResourceForm;
    this.showNoteForm = false;
    this.selectedResourceFile = null;
    if (!this.showResourceForm) this.resourceForm.reset({ type: 'Link' });
  }

  toggleNoteForm() {
    this.showNoteForm = !this.showNoteForm;
    this.showResourceForm = false;
    this.selectedNoteFile = null;
    if (!this.showNoteForm) this.noteForm.reset({ targetBranch: 'COMP', targetYear: 3 });
  }

  onNoteFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.selectedNoteFile = file;
  }

  onResourceFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.selectedResourceFile = file;
  }

  submitNote() {
    if (this.noteForm.valid) {
      if (!this.selectedNoteFile) {
        alert("Please select a file to upload for this note.");
        return;
      }

      this.isPostingMaterial = true;
      this.dashboardService.uploadFile(this.selectedNoteFile, 'notes').subscribe({
        next: (uploadResponse) => {
          const payload = {
            ...this.noteForm.value,
            fileUrl: uploadResponse.url,
            uploadedByAdmin: { id: this.adminId }
          };

          this.dashboardService.createNote(payload).subscribe({
            next: () => {
              this.isPostingMaterial = false;
              this.toggleNoteForm();
              this.loadDashboardData();
              alert("Study Note uploaded and published successfully!");
            },
            error: () => {
              this.isPostingMaterial = false;
              alert("Failed to save note data.");
            }
          });
        },
        error: (err) => {
          this.isPostingMaterial = false;
          alert("Failed to upload the file to the server.");
          console.error(err);
        }
      });
    } else {
      this.noteForm.markAllAsTouched();
    }
  }

  submitResource() {
    if (this.resourceForm.valid) {
      const type = this.resourceForm.get('type')?.value;

      if (type === 'PDF') {
        if (!this.selectedResourceFile) {
          alert("Please select a PDF file to upload.");
          return;
        }
        
        this.isPostingMaterial = true;
        this.dashboardService.uploadFile(this.selectedResourceFile, 'resources').subscribe({
          next: (uploadResponse) => {
            const payload = {
              ...this.resourceForm.value,
              fileUrl: uploadResponse.url,
              createdByAdmin: { id: this.adminId }
            };
            this.finalizeResourceSubmit(payload);
          },
          error: (err) => {
            this.isPostingMaterial = false;
            alert("Failed to upload PDF resource.");
            console.error(err);
          }
        });

      } else {
        const fileUrl = this.resourceForm.get('fileUrl')?.value;
        if (!fileUrl) {
          alert("Please provide the Access URL for this resource.");
          return;
        }

        this.isPostingMaterial = true;
        const payload = {
          ...this.resourceForm.value,
          createdByAdmin: { id: this.adminId }
        };
        this.finalizeResourceSubmit(payload);
      }
    } else {
      this.resourceForm.markAllAsTouched();
    }
  }

  finalizeResourceSubmit(payload: any) {
    this.dashboardService.createResource(payload).subscribe({
      next: () => {
        this.isPostingMaterial = false;
        this.toggleResourceForm();
        this.loadDashboardData(); 
        alert("Resource added successfully!");
      },
      error: () => {
        this.isPostingMaterial = false;
        alert("Failed to add resource.");
      }
    });
  }

  deleteResource(id: number) {
    if(confirm("Are you sure you want to delete this global resource?")) {
      this.dashboardService.deleteResource(id).subscribe({
        next: () => {
          this.allResources = this.allResources.filter(r => r.id !== id);
        },
        error: () => alert("Failed to delete resource.")
      });
    }
  }

  deleteNote(id: number) {
    if(confirm("Are you sure you want to delete this study note?")) {
      this.dashboardService.deleteNote(id).subscribe({
        next: () => {
          this.allNotes = this.allNotes.filter(n => n.id !== id);
        },
        error: () => alert("Failed to delete note.")
      });
    }
  }


  // ==========================================
  // STUDENT MANAGEMENT LOGIC
  // ==========================================
  calculateStudentStats() {
    if (!this.allStudents.length) return;

    const totalCgpa = this.allStudents.reduce((sum, s) => sum + (s.cgpa || 0), 0);
    this.avgCgpa = (totalCgpa / this.allStudents.length).toFixed(2);

    const counts: any = {};
    this.allStudents.forEach(s => {
      const branch = s.branch || 'Unknown';
      counts[branch] = (counts[branch] || 0) + 1;
    });

    this.branchStats = Object.keys(counts).map(branch => ({
      branch,
      count: counts[branch],
      percentage: Math.round((counts[branch] / this.allStudents.length) * 100)
    })).sort((a, b) => b.count - a.count);
  }

  applyStudentFilters(search: string, branch: string, year: string) {
    this.searchQuery = search.toLowerCase();
    this.filterBranch = branch;
    this.filterYear = year;

    this.filteredStudents = this.allStudents.filter(s => {
      const matchName = s.name.toLowerCase().includes(this.searchQuery) || s.email.toLowerCase().includes(this.searchQuery);
      const matchBranch = this.filterBranch ? s.branch === this.filterBranch : true;
      const matchYear = this.filterYear ? s.year?.toString() === this.filterYear : true;
      return matchName && matchBranch && matchYear;
    });
  }

  viewStudentProfile(studentId: number) {
    this.isFetchingStudentProfile = true;
    this.selectedStudentId = studentId;
    this.dashboardService.getStudentFullDetails(studentId).subscribe({
      next: (data) => {
        this.selectedStudent = data;
        this.isFetchingStudentProfile = false;
      },
      error: () => {
        this.isFetchingStudentProfile = false;
        alert("Failed to load student profile.");
        this.closeStudentProfile();
      }
    });
  }

  closeStudentProfile() {
    this.selectedStudentId = null;
    this.selectedStudent = null;
  }

  deleteStudent(id: number) {
    if(confirm("Are you sure you want to completely remove this student from the system?")) {
      this.dashboardService.deleteStudent(id).subscribe({
        next: () => {
          this.allStudents = this.allStudents.filter(s => s.id !== id);
          this.calculateStudentStats();
          this.applyStudentFilters(this.searchQuery, this.filterBranch, this.filterYear);
          alert("Student deleted successfully.");
        },
        error: () => alert("Failed to delete student.")
      });
    }
  }

  // ==========================================
  // INTERNSHIPS LOGIC
  // ==========================================
  viewCandidates(job: any) {
    this.isFetchingApplicants = true;
    this.selectedInternshipId = job.id;
    this.currentInternshipName = `${job.company} - ${job.role}`;

    this.dashboardService.getInternshipApplicants(job.id).subscribe({
      next: (data) => {
        this.applicantsList = data;
        this.isFetchingApplicants = false;
      },
      error: (err) => {
        console.error("Error fetching applicants", err);
        this.isFetchingApplicants = false;
        alert("Could not load applicants.");
      }
    });
  }

  updateCandidateStatus(application: any, newStatus: string) {
    const targetAppId = application.applicationId || application.id;
    if (!targetAppId) {
      alert("Error: Missing Application ID. Ensure backend DTO returns applicationId.");
      return;
    }

    if(confirm(`Mark ${application.studentName} as ${newStatus}?`)) {
      this.dashboardService['http'].patch(`/api/applications/${targetAppId}/status`, { status: newStatus }).subscribe({
        next: () => {
          application.applicationStatus = newStatus;
          alert(`Candidate successfully marked as ${newStatus}`);
        },
        error: (err) => {
          console.error(err);
          alert("Failed to update status.");
        }
      });
    }
  }

  closeApplicants() {
    this.selectedInternshipId = null;
    this.applicantsList = [];
  }

  toggleInternshipForm() {
    this.showInternshipForm = !this.showInternshipForm;
    if (!this.showInternshipForm) {
      this.internshipForm.reset({ status: 'OPEN' });
    }
  }

  submitInternship() {
    if (this.internshipForm.valid) {
      this.isPostingJob = true;
      const payload = {
        ...this.internshipForm.value,
        createdByAdmin: { id: this.adminId }
      };

      this.dashboardService['http'].post('/api/internships/', payload).subscribe({
        next: () => {
          this.isPostingJob = false;
          this.toggleInternshipForm();
          this.loadDashboardData();
          alert("Internship Posted Successfully!");
        },
        error: (err) => {
          this.isPostingJob = false;
          alert("Failed to post internship.");
        }
      });
    } else {
      this.internshipForm.markAllAsTouched();
    }
  }

  // ==========================================
  // UTILS
  // ==========================================
  approveUser(id: number) {
    if(confirm("Are you sure you want to approve this admin? They will receive an email immediately.")) {
      this.dashboardService.approveAdmin(id).subscribe({
        next: () => {
          this.pendingAdmins = this.pendingAdmins.filter(admin => admin.id !== id);
          this.pendingApprovalsCount = this.pendingAdmins.length;
          alert("Admin Approved Successfully! Email sent.");
        },
        error: (err) => alert("Failed to approve admin.")
      });
    }
  }

  getInitials(name: string): string {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    this.router.navigate(['/auth/login']);
  }
}