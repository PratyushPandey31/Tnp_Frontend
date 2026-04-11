import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: false
})
export class RegisterComponent implements OnInit {
  activeTab: 'student' | 'admin' = 'student'; // Controls the toggle
  studentForm!: FormGroup;
  adminForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Student Form Setup
    this.studentForm = this.fb.group({
      tnprollNo: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      branch: ['', Validators.required],
      year: ['', Validators.required],
      cgpa: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      skills: [''] 
    });

    // 2. Admin Form Setup
    this.adminForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required],
      designation: ['', Validators.required]
    });
  }

  // Switch tabs and clear errors
  switchTab(tab: 'student' | 'admin') {
    this.activeTab = tab;
    this.errorMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';

    // --- STUDENT ---
    if (this.activeTab === 'student') {
      if (this.studentForm.valid) {
        this.isLoading = true;
        this.authService.registerStudent(this.studentForm.value).subscribe({
          next: () => {
            // Give a small delay so the user sees the button change before routing
            setTimeout(() => {
              this.isLoading = false;
              this.router.navigate(['/auth/login'], { queryParams: { role: 'student', registered: 'true' } });
            }, 800);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || 'Student registration failed. Is the backend running?';
          }
        });
      } else {
        this.studentForm.markAllAsTouched();
      }
    } 
    
    // --- ADMIN ---
    else if (this.activeTab === 'admin') {
      if (this.adminForm.valid) {
        this.isLoading = true;
        this.authService.registerAdmin(this.adminForm.value).subscribe({
          next: () => {
            // Routing to our newly fixed Pending Approval page
            setTimeout(() => {
              this.isLoading = false;
              this.router.navigate(['/auth/pending-approval']).catch(e => {
                console.error("Routing failed:", e);
                this.errorMessage = "Account created, but failed to load the next page.";
              });
            }, 800);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || 'Admin registration failed. Email might be in use.';
          }
        });
      } else {
        this.adminForm.markAllAsTouched();
      }
    }
  }
}