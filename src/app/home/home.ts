// home.component.ts - Complete version
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
import { SettingOptionComponent } from '../setting-option/setting-option';
import { HelpComponent } from '../help.component/help.component';
import { CreateGroupModalComponent } from '../create-group-chat/create-group-chat';

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
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    ChatNavigationComponent,
    CreateGroupModalComponent,
    SettingOptionComponent,
    HelpComponent,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Chat type and selection
  currentChatType: string = 'world';
  currentChatId: string = '';
  navigationWidth: number = 320; // Default navigation width

  // Modal states
  showCreateGroupModal: boolean = false;
  isSettingsModalOpen: boolean = false;
  isHelpModalOpen: boolean = false;
  isMenuOpen: boolean = false;

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
  isLoading: boolean = true;

  // User and message data
  currentMessage: string = '';
  currentUser: User | null = null;

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

  ngOnInit(): void {
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

  ngOnDestroy(): void {
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

  // Initialize chat functionality
  private initializeChat(): void {
    // Load initial world messages
    this.loadWorldMessages();

    // Subscribe to real-time updates
    this.subscribeToRealTimeUpdates();

    // Join world chat room
    this.chatService.joinRoom('world');
  }

  private loadWorldMessages(): void {
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

  private subscribeToRealTimeUpdates(): void {
    // Subscribe to world messages
    this.chatService.worldMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.worldMessages = this.transformApiMessages(messages);
        setTimeout(() => this.scrollToBottom(), 100);
      });

    // Subscribe to group chats updates
    this.chatService.groupChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((groups) => {
        this.groupChats = groups;
      });

    // Subscribe to private chats updates
    this.chatService.privateChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chats) => {
        this.privateChats = chats;
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

  // Message transformation utilities
  private transformApiMessages(apiMessages: any[]): Message[] {
    return apiMessages.map((msg) => this.transformApiMessage(msg));
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
      CA: '🇨🇦',
      IN: '🇮🇳',
      CN: '🇨🇳',
      KR: '🇰🇷',
      SG: '🇸🇬',
      MY: '🇲🇾',
      TH: '🇹🇭',
      VN: '🇻🇳',
      ID: '🇮🇩',
      // Add more countries as needed
    };
    return countryFlags[countryCode] || '🌍';
  }

  // Chat Navigation Event Handlers
  onChatTypeChanged(chatType: string): void {
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

  onChatSelected(event: { type: string; id: string }): void {
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

  onNavigationStateChanged(state: {
    isCollapsed: boolean;
    width: number;
  }): void {
    this.navigationWidth = state.width;
    console.log('Navigation state changed:', state);
  }

  // Load messages for specific chats
  private loadGroupMessages(groupId: string): void {
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

  private loadPrivateMessages(chatId: string): void {
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

  // Group creation modal methods
  openCreateGroupModal(): void {
    this.showCreateGroupModal = true;
  }

  onCreateGroupModalClosed(): void {
    this.showCreateGroupModal = false;
  }

  onGroupCreated(group: ApiChatRoom): void {
    console.log('New group created:', group);
    this.showCreateGroupModal = false;

    // Switch to groups view and select the new group
    this.currentChatType = 'groups';
    this.currentChatId = group.id;

    // Load messages for the new group
    this.loadGroupMessages(group.id);
    this.chatService.joinRoom('group', group.id);
  }

  triggerCreateGroup(): void {
    if (this.currentChatType !== 'groups') {
      this.currentChatType = 'groups';
    }
    this.openCreateGroupModal();
  }

  // Helper methods for template visibility
  shouldShowMessages(): boolean {
    return (
      this.currentChatType === 'world' ||
      (this.currentChatType === 'groups' && !!this.currentChatId) ||
      (this.currentChatType === 'private' && !!this.currentChatId)
    );
  }

  shouldShowInput(): boolean {
    return this.shouldShowMessages();
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
          const group = this.groupChats.find(
            (g) => g.id === this.currentChatId
          );
          return group?.name || 'Group Chat';
        }
        return 'Group Chats';
      case 'private':
        if (this.currentChatId) {
          const chat = this.privateChats.find(
            (c) => c.id === this.currentChatId
          );
          return chat?.name || 'Private Chat';
        }
        return 'Private Messages';
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
        if (this.currentChatId) {
          const group = this.groupChats.find(
            (g) => g.id === this.currentChatId
          );
          return group?.description || 'Group conversation';
        }
        return this.groupChats.length === 0
          ? 'Create your first group to get started'
          : 'Select a group to start chatting';
      case 'private':
        return this.currentChatId
          ? 'Private conversation'
          : this.privateChats.length === 0
          ? 'Start your first private conversation'
          : 'Select a conversation to start chatting';
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

  // Get country flag for current user
  get currentUserCountry(): string {
    if (!this.currentUser) return '🌍';
    return this.getCountryFlag(this.currentUser.country);
  }

  // User profile and authentication
  private loadUserProfile(): void {
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

  // Send message functionality
  sendMessage(): void {
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
      this.sendWorldMessage(content);
    } else if (this.currentChatType === 'groups') {
      this.sendGroupMessage(content);
    } else if (this.currentChatType === 'private') {
      this.sendPrivateMessage(content);
    }

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private sendWorldMessage(content: string): void {
    this.chatService
      .sendWorldMessage(content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
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
  }

  private sendGroupMessage(content: string): void {
    this.chatService
      .sendGroupMessage(this.currentChatId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
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
  }

  private sendPrivateMessage(content: string): void {
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

  // Event handlers
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Menu and modal controls
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onSettingsClick(): void {
    this.isMenuOpen = false;
    this.isSettingsModalOpen = true;
  }

  onSettingsClose(): void {
    this.isSettingsModalOpen = false;
  }

  onHelpClick(): void {
    this.isMenuOpen = false;
    this.isHelpModalOpen = true;
  }

  onHelpClose(): void {
    this.isHelpModalOpen = false;
  }

  onLogoutClick(): void {
    this.isMenuOpen = false;
    this.authService.logout();
  }

  onGoToLogin(): void {
    this.authService.logout();
  }

  // Utility methods
  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }
}
