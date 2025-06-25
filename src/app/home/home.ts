// home.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import { ChatNavigationComponent } from '../components/chat-navigation/chat-navigation.component';

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
  imports: [CommonModule, FormsModule, MatIconModule, ChatNavigationComponent],
  template: `
    <!-- Chat Navigation -->
    <app-chat-navigation
      [isMobile]="isMobile"
      (chatTypeChanged)="onChatTypeChanged($event)"
      (chatSelected)="onChatSelected($event)"
    ></app-chat-navigation>

    <!-- Main Chat Container -->
    <div
      class="chat-container"
      [class.with-navigation]="true"
      [class.mobile]="isMobile"
    >
      <!-- Loading state -->
      <div *ngIf="isLoading" class="loading-container">
        <div class="loading-spinner">Loading...</div>
      </div>

      <!-- Main chat interface -->
      <div *ngIf="!isLoading && currentUser" class="chat-content">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-content">
            <h1>{{ getCurrentChatTitle() }}</h1>
            <span class="subtitle">{{ getCurrentChatSubtitle() }}</span>
          </div>
          <div class="header-right">
            <div class="online-indicator" *ngIf="currentChatType === 'world'">
              <div class="online-dot"></div>
              <span>{{ onlineUsers.length }} Online</span>
            </div>

            <button class="profile-button" (click)="toggleMenu()">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
          </div>
        </div>

        <!-- Profile Menu -->
        <div
          class="profile-menu-overlay"
          *ngIf="isMenuOpen"
          (click)="toggleMenu()"
        >
          <div class="profile-menu" (click)="$event.stopPropagation()">
            <div class="profile-header">
              <div class="profile-avatar">
                <mat-icon>account_circle</mat-icon>
              </div>
              <div class="profile-info">
                <div class="profile-name">{{ currentUserDisplayName }}</div>
                <div class="profile-email">{{ currentUser.email }}</div>
              </div>
            </div>

            <div class="menu-divider"></div>

            <div class="menu-items">
              <button class="menu-item" (click)="onSettingsClick()">
                <mat-icon>settings</mat-icon>
                Settings
              </button>

              <button class="menu-item" (click)="onHelpClick()">
                <mat-icon>help</mat-icon>
                Help
              </button>

              <div class="menu-divider"></div>

              <button class="menu-item logout" (click)="onLogoutClick()">
                <mat-icon>logout</mat-icon>
                Log Out
              </button>
            </div>
          </div>
        </div>

        <!-- Messages Area -->
        <div class="chat-messages">
          <div
            *ngFor="let message of getCurrentMessages()"
            class="message-wrapper"
            [class.own-message]="message.isOwnMessage"
            [class.system-message]="message.userId === 'system'"
          >
            <div class="message-bubble">
              <div
                class="message-header"
                *ngIf="!message.isOwnMessage && message.userId !== 'system'"
              >
                <span class="username">{{ message.username }}</span>
                <span class="country">{{ message.country }}</span>
              </div>

              <div class="message-text">{{ message.text }}</div>

              <div class="message-time">
                {{ message.timestamp | date : 'HH:mm' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input">
          <div class="input-container">
            <div class="user-indicator">
              <span class="your-flag">{{ currentUserCountry }}</span>
              <span class="your-name">{{ currentUserDisplayName }}</span>
            </div>

            <textarea
              [(ngModel)]="currentMessage"
              (keydown)="onKeyPress($event)"
              [placeholder]="getInputPlaceholder()"
              class="message-input"
              rows="1"
              [disabled]="!currentUser"
            >
            </textarea>

            <button
              (click)="sendMessage()"
              [disabled]="currentMessage.trim() === '' || !currentUser"
              class="send-button"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Error state when user is not available -->
      <div *ngIf="!isLoading && !currentUser" class="error-container">
        <p>Please log in to access GlobalChat.</p>
        <button (click)="onGoToLogin()" class="login-button">
          Go to Login
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Chat type and selection
  currentChatType: string = 'world';
  currentChatId: string = '';
  isMobile: boolean = false;

  // World chat messages
  worldMessages: Message[] = [
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

  // Group chat messages (sample data)
  groupMessages: { [key: string]: Message[] } = {
    group1: [
      {
        id: 1,
        text: 'Welcome to Tech Enthusiasts! 💻',
        username: 'Admin',
        userId: 'admin',
        timestamp: new Date(Date.now() - 600000),
        country: '🤖',
        isOwnMessage: false,
      },
      {
        id: 2,
        text: 'Check out this new framework!',
        username: 'DevMaster',
        userId: 'dev1',
        timestamp: new Date(Date.now() - 300000),
        country: '🇺🇸',
        isOwnMessage: false,
      },
    ],
    group2: [
      {
        id: 1,
        text: 'Travel planning discussions here! ✈️',
        username: 'TravelBot',
        userId: 'bot',
        timestamp: new Date(Date.now() - 900000),
        country: '🌍',
        isOwnMessage: false,
      },
    ],
    group3: [
      {
        id: 1,
        text: '¡Bienvenidos al intercambio de idiomas! 🗣️',
        username: 'LanguageBot',
        userId: 'langbot',
        timestamp: new Date(Date.now() - 1200000),
        country: '🌐',
        isOwnMessage: false,
      },
    ],
  };

  // Private chat messages (sample data)
  privateMessages: { [key: string]: Message[] } = {
    user1: [
      {
        id: 1,
        text: 'Hi there! How are you doing?',
        username: 'SakuraUser',
        userId: 'user1',
        timestamp: new Date(Date.now() - 900000),
        country: '🇯🇵',
        isOwnMessage: false,
      },
      {
        id: 2,
        text: 'Thanks for the help!',
        username: 'SakuraUser',
        userId: 'user1',
        timestamp: new Date(Date.now() - 180000),
        country: '🇯🇵',
        isOwnMessage: false,
      },
    ],
    user2: [
      {
        id: 1,
        text: 'Hey! Want to grab coffee tomorrow?',
        username: 'NYCExplorer',
        userId: 'user2',
        timestamp: new Date(Date.now() - 600000),
        country: '🇺🇸',
        isOwnMessage: false,
      },
      {
        id: 2,
        text: 'See you tomorrow!',
        username: 'NYCExplorer',
        userId: 'user2',
        timestamp: new Date(Date.now() - 420000),
        country: '🇺🇸',
        isOwnMessage: false,
      },
    ],
    user3: [
      {
        id: 1,
        text: 'The weather is lovely today',
        username: 'LondonVibes',
        userId: 'user3',
        timestamp: new Date(Date.now() - 720000),
        country: '🇬🇧',
        isOwnMessage: false,
      },
    ],
  };

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
    // Check mobile view
    this.checkMobileView();
    window.addEventListener('resize', () => {
      this.checkMobileView();
    });

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

  checkMobileView() {
    this.isMobile = window.innerWidth <= 768;
  }

  // Chat Navigation Event Handlers
  onChatTypeChanged(chatType: string) {
    this.currentChatType = chatType;
    this.currentChatId = '';
    console.log('Chat type changed to:', chatType);
  }

  onChatSelected(event: { type: string; id: string }) {
    this.currentChatType = event.type;
    this.currentChatId = event.id;
    console.log('Chat selected:', event);
  }

  // Get current messages based on chat type and selection
  getCurrentMessages(): Message[] {
    switch (this.currentChatType) {
      case 'world':
        return this.worldMessages;
      case 'groups':
        return this.currentChatId
          ? this.groupMessages[this.currentChatId] || []
          : [];
      case 'private':
        return this.currentChatId
          ? this.privateMessages[this.currentChatId] || []
          : [];
      default:
        return this.worldMessages;
    }
  }

  // Get current chat title
  getCurrentChatTitle(): string {
    switch (this.currentChatType) {
      case 'world':
        return 'GlobalChat';
      case 'groups':
        if (this.currentChatId) {
          const groupNames: { [key: string]: string } = {
            group1: 'Tech Enthusiasts',
            group2: 'Travel Buddies',
            group3: 'Language Exchange',
          };
          return groupNames[this.currentChatId] || 'Group Chat';
        }
        return 'Select a Group';
      case 'private':
        if (this.currentChatId) {
          const userNames: { [key: string]: string } = {
            user1: 'SakuraUser',
            user2: 'NYCExplorer',
            user3: 'LondonVibes',
          };
          return userNames[this.currentChatId] || 'Private Chat';
        }
        return 'Select a Contact';
      default:
        return 'GlobalChat';
    }
  }

  // Get current chat subtitle
  getCurrentChatSubtitle(): string {
    switch (this.currentChatType) {
      case 'world':
        return 'Connect with the world';
      case 'groups':
        return this.currentChatId
          ? 'Group conversation'
          : 'Choose a group to start chatting';
      case 'private':
        return this.currentChatId
          ? 'Private conversation'
          : 'Choose a contact to start chatting';
      default:
        return 'Connect with the world';
    }
  }

  // Get input placeholder text
  getInputPlaceholder(): string {
    switch (this.currentChatType) {
      case 'world':
        return 'Share your message with the world...';
      case 'groups':
        return this.currentChatId
          ? 'Message the group...'
          : 'Select a group to start chatting';
      case 'private':
        return this.currentChatId
          ? 'Type a message...'
          : 'Select a contact to start chatting';
      default:
        return 'Share your message with the world...';
    }
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

    // Don't allow sending if no chat is selected for groups/private
    if (
      (this.currentChatType === 'groups' ||
        this.currentChatType === 'private') &&
      !this.currentChatId
    ) {
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: this.getNextMessageId(),
      text: this.currentMessage,
      username: this.currentUserDisplayName,
      userId: this.currentUser.id,
      timestamp: new Date(),
      country: this.currentUserCountry,
      isOwnMessage: true,
    };

    // Add to appropriate message array
    switch (this.currentChatType) {
      case 'world':
        this.worldMessages.push(userMessage);
        break;
      case 'groups':
        if (this.currentChatId) {
          if (!this.groupMessages[this.currentChatId]) {
            this.groupMessages[this.currentChatId] = [];
          }
          this.groupMessages[this.currentChatId].push(userMessage);
        }
        break;
      case 'private':
        if (this.currentChatId) {
          if (!this.privateMessages[this.currentChatId]) {
            this.privateMessages[this.currentChatId] = [];
          }
          this.privateMessages[this.currentChatId].push(userMessage);
        }
        break;
    }

    // Clear input
    this.currentMessage = '';

    // In a real app, send to server via HTTP/WebSocket
    // this.http.post(`${this.authService.getApiUrl()}/messages`, userMessage).subscribe();

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);

    // Simulate responses only for world chat
    if (this.currentChatType === 'world') {
      this.simulateGlobalResponse();
    }
  }

  private getNextMessageId(): number {
    const allMessages = [
      ...this.worldMessages,
      ...Object.values(this.groupMessages).flat(),
      ...Object.values(this.privateMessages).flat(),
    ];
    return Math.max(...allMessages.map((m) => m.id), 0) + 1;
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
        id: this.getNextMessageId(),
        text: randomResponse,
        username: randomUser.username,
        userId: randomUser.userId,
        timestamp: new Date(),
        country: randomUser.country,
        isOwnMessage: false,
      };

      this.worldMessages.push(responseMessage);
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
          this.worldMessages = messages;
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
