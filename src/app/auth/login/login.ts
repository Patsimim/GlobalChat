// auth/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  loginData = {
    email: '',
    password: '',
  };

  errorMessage = '';
  isLoading = false;

  constructor(private router: Router, private http: HttpClient) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    // Replace with your actual login API endpoint
    this.http
      .post('http://localhost:3000/api/auth/login', this.loginData)
      .subscribe({
        next: (response: any) => {
          // Handle successful login
          localStorage.setItem('token', response.token);
          this.router.navigate(['/chat']);
        },
        error: (error) => {
          this.errorMessage = 'Login failed. Please check your credentials.';
          this.isLoading = false;
        },
      });
  }
}
