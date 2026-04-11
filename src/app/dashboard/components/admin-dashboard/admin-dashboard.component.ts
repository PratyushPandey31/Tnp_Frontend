import { Component, OnInit } from '@angular/core';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // ADDED FOR FORMS

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  isLoading = true;
  adminData: any = null;
  adminId!: number; // Storing this to use when posting jobs
  
  // View Controller
  currentView: 'overview' | 'internships' = 'overview'; // Controls which section is visible

  // Security Flags
  isSuperAdmin = false;
  readonly SUPER_ADMIN_EMAIL = 'engineerindmind1209@gmail.com'; 
  
  // Metrics & Data
  totalStudents = 0;
  activeInternshipsCount = 0;
  pendingApprovalsCount = 0;
  totalSessions = 0;
  pendingAdmins: any[] = [];
  allInternships: any[] = []; // Holds the list of jobs

  // Internship Form
  internshipForm!: FormGroup;
  showInternshipForm = false; // Toggles the "Post Job" modal/form
  isPostingJob = false;

  constructor(
    private dashboardService: AdminDashboardService,
    private router: Router,
    private fb: FormBuilder // Injected FormBuilder
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

      // Initialize the Internship Form
      this.internshipForm = this.fb.group({
        role: ['', Validators.required],
        company: ['', Validators.required],
        stipend: ['', Validators.required],
        eligibility: ['', Validators.required],
        deadline: ['', Validators.required],
        description: ['', Validators.required],
        status: ['OPEN'], // Default status
        createdByAdminId: [this.adminId] // We need to send who created it!
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
      pending: this.dashboardService.getPendingAdmins()
    }).subscribe({
      next: (result) => {
        this.adminData = result.admin;
        this.totalSessions = result.admin.createdSessions?.length || 0;
        this.totalStudents = result.students.length;
        
        // Populate Internships
        this.allInternships = result.internships;
        this.activeInternshipsCount = this.allInternships.filter(i => i.status !== 'CLOSED').length;
        
        this.pendingAdmins = result.pending;
        this.pendingApprovalsCount = this.pendingAdmins.length;

        this.isLoading = false;
      },
      error: (err) => {
        console.error("Failed to load admin dashboard", err);
        this.isLoading = false;
      }
    });
  }

  // --- NEW: View Switching Logic ---
  switchView(view: 'overview' | 'internships') {
    this.currentView = view;
    this.showInternshipForm = false; // Reset form visibility when switching tabs
  }

  // --- NEW: Internship Logic ---
  toggleInternshipForm() {
    this.showInternshipForm = !this.showInternshipForm;
    if (!this.showInternshipForm) {
      this.internshipForm.reset({ status: 'OPEN', createdByAdminId: this.adminId });
    }
  }

  submitInternship() {
    if (this.internshipForm.valid) {
      this.isPostingJob = true;
      
      // Because your backend expects the POST to /api/internships/
      // We will add this direct HTTP call in the component for speed, 
      // though normally we put it in the service.
      this.dashboardService['http'].post('/api/internships/', this.internshipForm.value).subscribe({
        next: (newJob) => {
          this.isPostingJob = false;
          this.toggleInternshipForm(); // Hide form
          this.loadDashboardData(); // Refresh table
          alert("Internship Posted Successfully!");
        },
        error: (err) => {
          this.isPostingJob = false;
          alert("Failed to post internship. Check console.");
          console.error(err);
        }
      });
    } else {
      this.internshipForm.markAllAsTouched();
    }
  }
  // --------------------------------

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