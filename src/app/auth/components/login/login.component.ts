import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  activeTab: 'student' | 'admin' = 'student';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 1. Initialize the Form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // 2. Check URL for helpful redirects (e.g., ?role=admin&registered=true)
    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        this.activeTab = params['role'] === 'admin' ? 'admin' : 'student';
      }
      if (params['registered']) {
        this.successMessage = 'Account created successfully! Please sign in.';
      }
    });
  }

  switchTab(tab: 'student' | 'admin') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginForm.reset();
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.loginForm.valid) {
      this.isLoading = true;

      // Dynamically choose the correct API call based on the active tab
      const loginRequest = this.activeTab === 'student' 
        ? this.authService.loginStudent(this.loginForm.value)
        : this.authService.loginAdmin(this.loginForm.value);

      loginRequest.subscribe({
        next: (res) => {
          this.isLoading = false;
          // Redirect to their respective dashboards (We will build these next!)
          const targetRoute = this.activeTab === 'student' ? '/dashboard/student' : '/dashboard/admin';
          this.router.navigate([targetRoute]);
        },
        error: (err) => {
          this.isLoading = false;
          // This will catch the 403 Forbidden if the Admin is still PENDING!
          this.errorMessage = err.error?.message || 'Invalid credentials or account access denied.';
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}