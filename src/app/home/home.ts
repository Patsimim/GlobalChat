// home.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import {
  ChatService,
  ApiMessage,
  ApiChatRoom,
  ApiUser,
} from '../services/chat.service';
import { ChatNavigationComponent } from '../components/chat-navigation/chat-navigation.component';

import { MatIconModule } from '@angular/material/icon';

interface OnlineUser {
  id: string;
  username: string;
  country: string;
  isOnline: boolean;
}

interface Message {
  id: string;
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
      (navigationStateChanged)="onNavigationStateChanged($event)"
    ></app-chat-navigation>

    <!-- Main Chat Container -->
    <div
      class="chat-container"
      [style.padding-left.px]="isMobile ? 0 : navigationWidth"
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
  navigationWidth: number = 320; // Default navigation width

  // API-based data
  worldMessages: Message[] = [];
  groupChats: ApiChatRoom[] = [];
  privateChats: ApiChatRoom[] = [];
  onlineUsers: ApiUser[] = [];

  // Message arrays for different chats
  groupMessages: { [key: string]: Message[] } = {};
  privateMessages: { [key: string]: Message[] } = {};

  // Loading states
  isLoadingMessages: boolean = false;
  isSendingMessage: boolean = false;

  currentMessage: string = '';
  isMenuOpen: boolean = false;
  currentUser: User | null = null;
  isLoading: boolean = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private chatService: ChatService,
    private router: Router
  ) {
    // Debug authentication
    const token = this.authService.getToken();
    const isLoggedIn = this.authService.isLoggedIn();

    console.log('🔑 Token exists:', !!token);
    console.log('✅ Is logged in:', isLoggedIn);
    console.log('🔗 API URL:', this.authService.getApiUrl());

    if (token) {
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    }
  }

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
        } else {
          // User is logged in, initialize chat
          this.initializeChat();
        }
      });

    // Load user profile to ensure we have the latest data
    this.loadUserProfile();
  }

  private initializeChat() {
    // Load initial world messages
    this.loadWorldMessages();

    // Subscribe to real-time updates
    this.subscribeToRealTimeUpdates();

    // Join world chat room
    this.chatService.joinRoom('world');
  }

  private loadWorldMessages() {
    this.isLoadingMessages = true;
    this.chatService
      .loadWorldMessages(50, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.worldMessages = this.transformApiMessages(response.messages);
            this.chatService.updateLocalWorldMessages(response.messages);
          }
          this.isLoadingMessages = false;
        },
        error: (error) => {
          console.error('Error loading world messages:', error);
          this.isLoadingMessages = false;
        },
      });
  }

  private subscribeToRealTimeUpdates() {
    // Subscribe to world messages
    this.chatService.worldMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.worldMessages = this.transformApiMessages(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      });

    // Subscribe to new message notifications
    this.chatService.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        console.log('New message received:', event);
        // Handle notification, sound, etc.
      });

    // Subscribe to online users
    this.chatService.onlineUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((users) => {
        this.onlineUsers = users;
      });
  }

  private transformApiMessages(apiMessages: any[]): Message[] {
    return apiMessages.map((msg) => ({
      id: msg.id,
      text: msg.content,
      username: msg.senderName,
      userId: msg.senderId,
      timestamp: new Date(msg.timestamp),
      country: this.getCountryFlag(msg.senderCountry),
      isOwnMessage: msg.isOwnMessage,
    }));
  }

  private transformApiMessage(apiMessage: any): Message {
    return {
      id: apiMessage.id,
      text: apiMessage.content,
      username: apiMessage.senderName,
      userId: apiMessage.senderId,
      timestamp: new Date(apiMessage.timestamp),
      country: this.getCountryFlag(apiMessage.senderCountry),
      isOwnMessage: apiMessage.isOwnMessage,
    };
  }

  private getCountryFlag(countryCode: string): string {
    const countryFlags: { [key: string]: string } = {
      PH: '🇵🇭',
      US: '🇺🇸',
      JP: '🇯🇵',
      GB: '🇬🇧',
      FR: '🇫🇷',
      DE: '🇩🇪',
      AU: '🇦🇺',
      BR: '🇧🇷',
      // Add more countries as needed
    };
    return countryFlags[countryCode] || '🌍';
  }

  ngOnDestroy() {
    // Leave current room
    if (this.currentChatType === 'world') {
      this.chatService.leaveRoom('world');
    } else if (this.currentChatType === 'groups' && this.currentChatId) {
      this.chatService.leaveRoom('group', this.currentChatId);
    } else if (this.currentChatType === 'private' && this.currentChatId) {
      this.chatService.leaveRoom('private', this.currentChatId);
    }

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

    // Load data based on chat type
    if (chatType === 'world') {
      this.chatService.joinRoom('world');
    } else if (chatType === 'groups') {
      // Group chats are already loaded in navigation
    } else if (chatType === 'private') {
      // Private chats are already loaded in navigation
    }

    console.log('Chat type changed to:', chatType);
  }

  onChatSelected(event: { type: string; id: string }) {
    this.currentChatType = event.type;
    this.currentChatId = event.id;

    if (event.type === 'group') {
      this.loadGroupMessages(event.id);
      this.chatService.joinRoom('group', event.id);
    } else if (event.type === 'private') {
      this.loadPrivateMessages(event.id);
      this.chatService.joinRoom('private', event.id);
    }

    console.log('Chat selected:', event);
  }

  onNavigationStateChanged(state: { isCollapsed: boolean; width: number }) {
    this.navigationWidth = state.width;
    console.log('Navigation state changed:', state);
  }

  private loadGroupMessages(groupId: string) {
    this.isLoadingMessages = true;
    this.chatService
      .loadGroupMessages(groupId, 50, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const messages = this.transformApiMessages(response.messages);
            this.groupMessages[groupId] = messages;
            this.chatService.updateLocalGroupMessages(
              groupId,
              response.messages
            );
          }
          this.isLoadingMessages = false;
        },
        error: (error) => {
          console.error('Error loading group messages:', error);
          this.isLoadingMessages = false;
        },
      });

    // Subscribe to group messages for this specific group
    this.chatService
      .getGroupMessages$(groupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.groupMessages[groupId] = this.transformApiMessages(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      });
  }

  private loadPrivateMessages(chatId: string) {
    this.isLoadingMessages = true;
    this.chatService
      .loadPrivateMessages(chatId, 50, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const messages = this.transformApiMessages(response.messages);
            this.privateMessages[chatId] = messages;
            this.chatService.updateLocalPrivateMessages(
              chatId,
              response.messages
            );
          }
          this.isLoadingMessages = false;
        },
        error: (error) => {
          console.error('Error loading private messages:', error);
          this.isLoadingMessages = false;
        },
      });

    // Subscribe to private messages for this specific chat
    this.chatService
      .getPrivateMessages$(chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.privateMessages[chatId] = this.transformApiMessages(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      });
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
    if (
      this.currentMessage.trim() === '' ||
      !this.currentUser ||
      this.isSendingMessage
    )
      return;

    // Don't allow sending if no chat is selected for groups/private
    if (
      (this.currentChatType === 'groups' ||
        this.currentChatType === 'private') &&
      !this.currentChatId
    ) {
      return;
    }

    const content = this.currentMessage.trim();
    this.currentMessage = '';
    this.isSendingMessage = true;

    if (this.currentChatType === 'world') {
      this.chatService
        .sendWorldMessage(content)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Message will be added via socket event
              console.log('World message sent successfully');
            }
            this.isSendingMessage = false;
          },
          error: (error) => {
            console.error('Error sending world message:', error);
            this.currentMessage = content; // Restore message on error
            this.isSendingMessage = false;
          },
        });
    } else if (this.currentChatType === 'groups') {
      this.chatService
        .sendGroupMessage(this.currentChatId, content)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Message will be added via socket event
              console.log('Group message sent successfully');
            }
            this.isSendingMessage = false;
          },
          error: (error) => {
            console.error('Error sending group message:', error);
            this.currentMessage = content; // Restore message on error
            this.isSendingMessage = false;
          },
        });
    } else if (this.currentChatType === 'private') {
      // For private messages, we need the recipient ID
      const chat = this.privateChats.find((c) => c.id === this.currentChatId);
      if (!chat) {
        this.isSendingMessage = false;
        return;
      }

      const recipientId = chat.participants.find(
        (p) => p.id !== this.currentUser!.id
      )?.id;
      if (!recipientId) {
        this.isSendingMessage = false;
        return;
      }

      this.chatService
        .sendPrivateMessage(recipientId, content)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Message will be added via socket event
              console.log('Private message sent successfully');
            }
            this.isSendingMessage = false;
          },
          error: (error) => {
            console.error('Error sending private message:', error);
            this.currentMessage = content; // Restore message on error
            this.isSendingMessage = false;
          },
        });
    }

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private getNextMessageId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Remove the demo function since we're using real backend
  // simulateGlobalResponse() { ... } - REMOVED

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
    this.router.navigate(['/setting-option']);
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

  // Remove old demo functions since we're using real backend implementation
  // loadGlobalMessages() and connectToWebSocket() are now implemented above
}
