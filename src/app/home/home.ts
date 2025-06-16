// home.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../services/auth.service';

import { MatIconModule } from '@angular/material/icon';

interface OnlineUser {
  id: string;
  username: string;
  country: string;
  isOnline: boolean;
}

interface Message {
  id: number;
  text: string;
  username: string;
  userId: string;
  timestamp: Date;
  country?: string;
  isOwnMessage: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  messages: Message[] = [
    {
      id: 1,
      text: 'Welcome to GlobalChat! 🌍 Connect with people worldwide!',
      username: 'System',
      userId: 'system',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      country: '🌐',
      isOwnMessage: false,
    },
    {
      id: 2,
      text: 'Hello everyone! Greetings from Tokyo! 🇯🇵',
      username: 'SakuraUser',
      userId: 'user1',
      timestamp: new Date(Date.now() - 180000), // 3 minutes ago
      country: '🇯🇵',
      isOwnMessage: false,
    },
    {
      id: 3,
      text: 'Good morning from New York! ☀️',
      username: 'NYCExplorer',
      userId: 'user2',
      timestamp: new Date(Date.now() - 120000), // 2 minutes ago
      country: '🇺🇸',
      isOwnMessage: false,
    },
  ];

  onlineUsers: OnlineUser[] = [
    { id: 'user1', username: 'SakuraUser', country: '🇯🇵', isOnline: true },
    { id: 'user2', username: 'NYCExplorer', country: '🇺🇸', isOnline: true },
    { id: 'user3', username: 'LondonVibes', country: '🇬🇧', isOnline: true },
    { id: 'user4', username: 'ParisLife', country: '🇫🇷', isOnline: true },
    { id: 'user5', username: 'BerlinTech', country: '🇩🇪', isOnline: true },
  ];

  currentMessage: string = '';
  isMenuOpen: boolean = false;
  currentUser: User | null = null;
  isLoading: boolean = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is authenticated
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        this.isLoading = false;

        if (!user) {
          // User logged out, redirect to login
          this.router.navigate(['/auth/login']);
        }
      });

    // Load user profile to ensure we have the latest data
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Get display name for current user
  get currentUserDisplayName(): string {
    if (!this.currentUser) return 'Guest';
    return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
  }

  // Get country flag - you might want to create a mapping for this
  get currentUserCountry(): string {
    if (!this.currentUser) return '🌍';
    // Create a mapping for country codes to flags
    const countryFlags: { [key: string]: string } = {
      PH: '🇵🇭',
      US: '🇺🇸',
      JP: '🇯🇵',
      GB: '🇬🇧',
      FR: '🇫🇷',
      DE: '🇩🇪',
      // Add more countries as needed
    };
    return countryFlags[this.currentUser.country] || '🌍';
  }

  private loadUserProfile() {
    this.authService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Profile loaded successfully');
        },
        error: (error) => {
          console.error('Failed to load profile:', error);
          // If profile loading fails, user might need to re-authenticate
          if (error.status === 401) {
            this.authService.logout();
          }
        },
      });
  }

  sendMessage() {
    if (this.currentMessage.trim() === '' || !this.currentUser) return;

    // Add user message
    const userMessage: Message = {
      id: this.messages.length + 1,
      text: this.currentMessage,
      username: this.currentUserDisplayName,
      userId: this.currentUser.id,
      timestamp: new Date(),
      country: this.currentUserCountry,
      isOwnMessage: true,
    };

    this.messages.push(userMessage);

    // Clear input
    this.currentMessage = '';

    // In a real app, send to server via HTTP/WebSocket
    // this.http.post(`${this.authService.getApiUrl()}/messages`, userMessage).subscribe();

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);

    // Simulate other users responding (for demo)
    this.simulateGlobalResponse();
  }

  // Demo function - remove in production
  simulateGlobalResponse() {
    const responses = [
      'Nice to meet you! 👋',
      'Welcome to the global conversation! 🌍',
      'Hello from my side of the world! 🌟',
      'Great to have you here! 🎉',
      "How's the weather where you are? ☀️🌧️",
    ];

    const randomUsers = [
      { username: 'TokyoTraveler', country: '🇯🇵', userId: 'demo1' },
      { username: 'LondonLife', country: '🇬🇧', userId: 'demo2' },
      { username: 'SydneyVibes', country: '🇦🇺', userId: 'demo3' },
      { username: 'BrazilFan', country: '🇧🇷', userId: 'demo4' },
    ];

    setTimeout(() => {
      const randomUser =
        randomUsers[Math.floor(Math.random() * randomUsers.length)];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      const responseMessage: Message = {
        id: this.messages.length + 1,
        text: randomResponse,
        username: randomUser.username,
        userId: randomUser.userId,
        timestamp: new Date(),
        country: randomUser.country,
        isOwnMessage: false,
      };

      this.messages.push(responseMessage);
      this.scrollToBottom();
    }, 2000 + Math.random() * 3000); // Random delay 2-5 seconds
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onSettingsClick() {
    this.isMenuOpen = false;
    // Navigate to settings page
    this.router.navigate(['/settings']);
  }

  onHelpClick() {
    this.isMenuOpen = false;
    // Open help documentation
    window.open('https://your-help-url.com', '_blank');
  }

  onLogoutClick() {
    this.isMenuOpen = false;
    // Use AuthService to logout
    this.authService.logout();
    // AuthService will handle navigation to login page
  }

  onGoToLogin() {
    this.authService.logout();
    // The AuthService logout method will handle navigation to login
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  // Real implementation functions
  loadGlobalMessages() {
    const apiUrl = this.authService.getApiUrl();
    this.http
      .get<Message[]>(`${apiUrl}/messages/global`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.scrollToBottom();
        },
        error: (error) => {
          console.error('Failed to load messages:', error);
        },
      });
  }

  // WebSocket connection for real-time updates
  connectToWebSocket() {
    // Implementation for WebSocket connection
    // const socketUrl = this.authService.getSocketUrl();
    // Connect to WebSocket for real-time messages
  }
}
