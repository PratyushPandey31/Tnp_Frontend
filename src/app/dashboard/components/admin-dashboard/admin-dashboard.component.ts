import { Component, OnInit } from '@angular/core';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  isLoading = true;
  adminData: any = null;
  
  // Metrics
  totalStudents = 0;
  activeInternshipsCount = 0;
  pendingApprovalsCount = 0;
  totalSessions = 0;

  // Tables
  pendingAdmins: any[] = [];

  // Security Flags
  isSuperAdmin = false;
  readonly SUPER_ADMIN_EMAIL = 'engineerindmind1209@gmail.com'; 

  constructor(
    private dashboardService: AdminDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      // Decode the JWT Payload safely
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const adminId = tokenPayload.id;
      const userEmail = tokenPayload.sub; 

      // Set the security flag based on the exact email match
      this.isSuperAdmin = (userEmail === this.SUPER_ADMIN_EMAIL);

      // Fetch the dashboard data
      this.loadDashboardData(adminId);
    } catch (error) {
      console.error("Error parsing JWT token", error);
      this.logout(); // Force logout if token is corrupted
    }
  }

  loadDashboardData(adminId: number) {
    forkJoin({
      admin: this.dashboardService.getAdminFullDetails(adminId),
      students: this.dashboardService.getAllStudents(),
      internships: this.dashboardService.getAllInternships(),
      pending: this.dashboardService.getPendingAdmins()
    }).subscribe({
      next: (result) => {
        this.adminData = result.admin;
        this.totalSessions = result.admin.createdSessions?.length || 0;
        this.totalStudents = result.students.length;
        this.activeInternshipsCount = result.internships.filter(i => i.status !== 'CLOSED').length;
        
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

  approveUser(id: number) {
    if(confirm("Are you sure you want to approve this admin? They will receive an email immediately.")) {
      this.dashboardService.approveAdmin(id).subscribe({
        next: () => {
          // Remove them from the UI list instantly
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