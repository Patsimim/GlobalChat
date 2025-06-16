// src/app/auth/register/register.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { CountryService, Country } from '../../services/country.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent implements OnInit {
  registerData: RegisterRequest = {
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    password: '',
  };

  countries: Country[] = [];
  selectedCountry: Country | null = null;
  errorMessage = '';
  isLoading = false;
  showPassword = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private countryService: CountryService
  ) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit() {
    this.countries = this.countryService.getAllCountries();
  }

  onCountryChange(country: Country) {
    this.selectedCountry = country;
    this.registerData.country = country ? country.name : '';
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.errorMessage =
          error.error?.message || 'Registration failed. Please try again.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private validateForm(): boolean {
    if (!this.registerData.firstName.trim()) {
      this.errorMessage = 'First name is required';
      return false;
    }

    if (!this.registerData.lastName.trim()) {
      this.errorMessage = 'Last name is required';
      return false;
    }

    if (!this.registerData.email.trim()) {
      this.errorMessage = 'Email is required';
      return false;
    }

    if (!this.registerData.country.trim()) {
      this.errorMessage = 'Country is required';
      return false;
    }

    if (!this.registerData.password) {
      this.errorMessage = 'Password is required';
      return false;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerData.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return false;
    }

    return true;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
