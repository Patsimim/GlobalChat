// src/app/auth/register/register.ts - Working version
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
  Renderer2,
} from '@angular/core';
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
export class RegisterComponent implements OnInit, OnDestroy {
  registerData: RegisterRequest = {
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    password: '',
  };

  countries: Country[] = [];
  selectedCountry: string | null = null;
  errorMessage = '';
  isLoading = false;
  showPassword = false;
  isDropdownOpen = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private countryService: CountryService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2
  ) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit() {
    this.loadCountries();
  }

  ngOnDestroy() {
    // Clean up any body scroll locks
    this.unlockBodyScroll();
  }

  private loadCountries() {
    this.countries = this.countryService.getAllCountries();
    console.log('Countries loaded:', this.countries.length);
  }

  private lockBodyScroll() {
    // Prevent body scroll on mobile when dropdown is open
    if (window.innerWidth <= 768) {
      this.renderer.addClass(document.body, 'ng-select-dropdown-open');
    }
  }

  private unlockBodyScroll() {
    // Re-enable body scroll
    this.renderer.removeClass(document.body, 'ng-select-dropdown-open');
  }

  onDropdownOpen() {
    console.log('Dropdown opened');
    this.isDropdownOpen = true;
    this.lockBodyScroll();

    // Delay change detection slightly to prevent UI glitches
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  onDropdownClose() {
    console.log('Dropdown closed');
    this.isDropdownOpen = false;
    this.unlockBodyScroll();

    // Small delay to prevent UI flickering
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 150);
  }

  onCountryChange(countryCode: string | null) {
    console.log(
      'Country change triggered with:',
      countryCode,
      typeof countryCode
    );

    // Handle both string codes and null values
    if (countryCode && typeof countryCode === 'string' && countryCode.trim()) {
      this.selectedCountry = countryCode;
      const selectedCountryObj = this.countries.find(
        (c) => c.code === countryCode
      );

      if (selectedCountryObj) {
        this.registerData.country = selectedCountryObj.name;
        console.log('✅ Country selected successfully:', {
          code: countryCode,
          name: this.registerData.country,
        });

        // Clear any country-related error messages
        if (this.errorMessage === 'Country is required') {
          this.errorMessage = '';
        }
      } else {
        console.warn('⚠️ Country not found for code:', countryCode);
        this.handleInvalidSelection();
      }
    } else {
      // Handle null, undefined, or empty string
      console.log('🔄 Country deselected or invalid value');
      this.onCountryClear();
    }

    // Force UI update
    this.cdr.detectChanges();
  }

  onCountryClear() {
    console.log('🗑️ Country cleared');
    this.selectedCountry = null;
    this.registerData.country = '';

    // Clear country-specific error if it exists
    if (this.errorMessage === 'Country is required') {
      this.errorMessage = '';
    }

    // Force UI update
    this.cdr.detectChanges();
  }

  private handleInvalidSelection() {
    console.log('❌ Handling invalid country selection');
    this.selectedCountry = null;
    this.registerData.country = '';
    this.cdr.detectChanges();
  }

  onSubmit() {
    console.log('📝 Form submission attempted');

    if (!this.validateForm()) {
      console.log('❌ Form validation failed:', this.errorMessage);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('🚀 Submitting registration:', {
      ...this.registerData,
      password: '[HIDDEN]',
    });

    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        console.log('✅ Registration successful:', response);
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('❌ Registration error:', error);
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
    // Clear previous error
    this.errorMessage = '';

    // Validate first name
    if (!this.registerData.firstName.trim()) {
      this.errorMessage = 'First name is required';
      return false;
    }

    // Validate last name
    if (!this.registerData.lastName.trim()) {
      this.errorMessage = 'Last name is required';
      return false;
    }

    // Validate email
    if (!this.registerData.email.trim()) {
      this.errorMessage = 'Email is required';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerData.email.trim())) {
      this.errorMessage = 'Please enter a valid email address';
      return false;
    }

    // Validate country
    if (!this.registerData.country.trim()) {
      this.errorMessage = 'Country is required';
      return false;
    }

    // Validate password
    if (!this.registerData.password) {
      this.errorMessage = 'Password is required';
      return false;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return false;
    }

    console.log('✅ Form validation passed');
    return true;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    console.log('👁️ Password visibility toggled:', this.showPassword);
  }

  navigateToLogin() {
    console.log('🔄 Navigating to login');
    this.router.navigate(['/login']);
  }
}
