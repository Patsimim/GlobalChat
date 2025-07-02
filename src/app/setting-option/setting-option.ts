// setting-option.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-setting-option',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIconModule],
  templateUrl: './setting-option.html',
  styleUrl: './setting-option.scss',
})
export class SettingOptionComponent implements OnInit {
  activeTab: 'general' | 'account' = 'general';

  // General Settings
  selectedTheme: string = 'auto';
  selectedLanguage: string = 'en';

  // Account Settings
  accountForm: FormGroup;
  passwordForm: FormGroup;
  isEditingProfile: boolean = false;
  isChangingPassword: boolean = false;
  showDeleteConfirmation: boolean = false;

  // User data (you might get this from a service)
  currentUser = {
    name: 'John Doe',
    email: 'john.doe@example.com',
  };

  themes = [
    { value: 'light', label: 'Light', icon: 'light_mode' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode' },
    { value: 'auto', label: 'System', icon: 'brightness_auto' },
  ];

  languages = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
    { value: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  constructor(private formBuilder: FormBuilder, private router: Router) {
    this.accountForm = this.formBuilder.group({
      name: [
        this.currentUser.name,
        [Validators.required, Validators.minLength(2)],
      ],
      email: [this.currentUser.email, [Validators.required, Validators.email]],
    });

    this.passwordForm = this.formBuilder.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // Load saved preferences
    this.loadUserPreferences();
  }

  // Tab Navigation
  setActiveTab(tab: 'general' | 'account'): void {
    this.activeTab = tab;
  }

  // General Settings Methods
  onThemeChange(theme: string): void {
    this.selectedTheme = theme;
    this.applyTheme(theme);
    this.saveUserPreferences();
  }

  onLanguageChange(language: string): void {
    this.selectedLanguage = language;
    this.applyLanguage(language);
    this.saveUserPreferences();
  }

  private applyTheme(theme: string): void {
    // Implementation for theme switching
    console.log('Applying theme:', theme);
    // You would implement actual theme switching logic here
  }

  private applyLanguage(language: string): void {
    // Implementation for language switching
    console.log('Applying language:', language);
    // You would implement actual language switching logic here
  }

  // Account Settings Methods
  toggleEditProfile(): void {
    this.isEditingProfile = !this.isEditingProfile;
    if (!this.isEditingProfile) {
      // Reset form if canceling
      this.accountForm.patchValue({
        name: this.currentUser.name,
        email: this.currentUser.email,
      });
    }
  }

  saveProfile(): void {
    if (this.accountForm.valid) {
      const formData = this.accountForm.value;
      // Here you would call your service to update user profile
      console.log('Saving profile:', formData);

      // Update local user data
      this.currentUser.name = formData.name;
      this.currentUser.email = formData.email;

      this.isEditingProfile = false;
      // Show success message
    }
  }

  toggleChangePassword(): void {
    this.isChangingPassword = !this.isChangingPassword;
    if (!this.isChangingPassword) {
      this.passwordForm.reset();
    }
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      const formData = this.passwordForm.value;
      // Here you would call your service to change password
      console.log('Changing password');

      this.passwordForm.reset();
      this.isChangingPassword = false;
      // Show success message
    }
  }

  showDeleteAccountConfirmation(): void {
    this.showDeleteConfirmation = true;
  }

  hideDeleteAccountConfirmation(): void {
    this.showDeleteConfirmation = false;
  }

  deleteAccount(): void {
    // Here you would call your service to delete account
    console.log('Deleting account');
    this.showDeleteConfirmation = false;
    // Redirect to login or home page
  }

  // Form Validators
  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (
      newPassword &&
      confirmPassword &&
      newPassword.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  // Helper Methods
  private loadUserPreferences(): void {
    // Load from localStorage or service
    this.selectedTheme = localStorage.getItem('theme') || 'auto';
    this.selectedLanguage = localStorage.getItem('language') || 'en';
  }

  private saveUserPreferences(): void {
    // Save to localStorage or service
    localStorage.setItem('theme', this.selectedTheme);
    localStorage.setItem('language', this.selectedLanguage);
  }

  // Navigation
  goBack(): void {
    // Navigate back to previous page
    this.router.navigate(['/home']);
  }
}
