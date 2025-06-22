// home.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import { ChatService, ChatMessage, ChatRoom } from '../services/chat.service';
import {
  ChatNavigationComponent,
  ChatType,
} from '../components/chat-navigation/chat-navigation.component';

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
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Chat data
  messages: Message[] = [];
  onlineUsers: OnlineUser[] = [];
  groups: ChatRoom[] = [];
  privateChats: ChatRoom[] = [];

  // UI state
  currentMessage: string = '';
  isMenuOpen: boolean = false;
  currentUser: User | null = null;
  isLoading: boolean = true;

  // Chat navigation state
  activeChatType: ChatType = 'world';
  selectedChatId: string | null = null;
  isConnected: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private chatService: ChatService
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
      .subscribe((user: User | null) => {
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.disconnect();
  }

  private initializeChat() {
    // Subscribe to chat service observables
    this.chatService.worldMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chatMessages: ChatMessage[]) => {
        this.messages = this.convertChatMessagesToMessages(chatMessages);
        this.scrollToBottom();
      });

    this.chatService.onlineUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((users: OnlineUser[]) => {
        this.onlineUsers = users;
      });

    this.chatService.groupChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((groups: ChatRoom[]) => {
        this.groups = groups;
      });

    this.chatService.privateChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chats: ChatRoom[]) => {
        this.privateChats = chats;
      });

    this.chatService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected: boolean) => {
        this.isConnected = connected;
      });

    // Load initial data
    this.loadInitialData();
  }

  private loadInitialData() {
    // Load world messages
    this.chatService
      .loadWorldMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: ChatMessage[]) => {
          console.log('World messages loaded:', messages.length);
        },
        error: (error: any) => {
          console.error('Failed to load world messages:', error);
          // Show fallback message for demo
          this.addWelcomeMessage();
        },
      });

    // Load online users
    this.chatService
      .loadOnlineUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: OnlineUser[]) => {
          console.log('Online users loaded:', users.length);
        },
        error: (error: any) => {
          console.error('Failed to load online users:', error);
        },
      });

    // Load user's groups
    this.chatService
      .loadUserGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups: ChatRoom[]) => {
          console.log('User groups loaded:', groups.length);
        },
        error: (error: any) => {
          console.error('Failed to load groups:', error);
        },
      });

    // Load user's private chats
    this.chatService
      .loadUserPrivateChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chats: ChatRoom[]) => {
          console.log('Private chats loaded:', chats.length);
        },
        error: (error: any) => {
          console.error('Failed to load private chats:', error);
        },
      });
  }

  private convertChatMessagesToMessages(
    chatMessages: ChatMessage[]
  ): Message[] {
    return chatMessages.map((chatMsg, index) => ({
      id: index + 1,
      text: chatMsg.content,
      username: chatMsg.senderName,
      userId: chatMsg.senderId,
      timestamp: new Date(chatMsg.timestamp),
      country: chatMsg.senderCountry || '🌍',
      isOwnMessage: this.currentUser
        ? chatMsg.senderId === this.currentUser.id
        : false,
    }));
  }

  private addWelcomeMessage() {
    // Add a welcome message if no messages are loaded
    const welcomeMessage: Message = {
      id: 1,
      text: 'Welcome to GlobalChat! 🌍 Connect with people worldwide!',
      username: 'System',
      userId: 'system',
      timestamp: new Date(),
      country: '🌐',
      isOwnMessage: false,
    };
    this.messages = [welcomeMessage];
  }

  // Get display name for current user
  get currentUserDisplayName(): string {
    if (!this.currentUser) return 'Guest';
    return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
  }

  // Get country flag
  get currentUserCountry(): string {
    if (!this.currentUser) return '🌍';
    const countryFlags: { [key: string]: string } = {
      PH: '🇵🇭',
      US: '🇺🇸',
      JP: '🇯🇵',
      GB: '🇬🇧',
      FR: '🇫🇷',
      DE: '🇩🇪',
      CA: '🇨🇦',
      AU: '🇦🇺',
      IN: '🇮🇳',
      BR: '🇧🇷',
      MX: '🇲🇽',
      ES: '🇪🇸',
      IT: '🇮🇹',
      KR: '🇰🇷',
      CN: '🇨🇳',
    };
    return countryFlags[this.currentUser.country] || '🌍';
  }

  // Get online users count
  get onlineUsersCount(): number {
    return this.onlineUsers.length;
  }

  private loadUserProfile() {
    this.authService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Profile loaded successfully');
        },
        error: (error: any) => {
          console.error('Failed to load profile:', error);
          if (error.status === 401) {
            this.authService.logout();
          }
        },
      });
  }

  sendMessage() {
    if (this.currentMessage.trim() === '' || !this.currentUser) return;

    if (this.activeChatType === 'world') {
      this.sendWorldMessage();
    } else if (this.activeChatType === 'groups' && this.selectedChatId) {
      this.sendGroupMessage();
    } else if (this.activeChatType === 'private' && this.selectedChatId) {
      this.sendPrivateMessage();
    }
  }

  private sendWorldMessage() {
    const content = this.currentMessage.trim();
    this.currentMessage = '';

    this.chatService
      .sendWorldMessage(content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('World message sent successfully');
          this.scrollToBottom();
        },
        error: (error: any) => {
          console.error('Failed to send world message:', error);
          // Add message locally as fallback for demo
          this.addMessageLocally(content);
        },
      });
  }

  private sendGroupMessage() {
    if (!this.selectedChatId) return;

    const content = this.currentMessage.trim();
    this.currentMessage = '';

    this.chatService
      .sendGroupMessage(this.selectedChatId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Group message sent successfully');
        },
        error: (error: any) => {
          console.error('Failed to send group message:', error);
        },
      });
  }

  private sendPrivateMessage() {
    if (!this.selectedChatId) return;

    const content = this.currentMessage.trim();
    this.currentMessage = '';

    // For private messages, we need the recipient ID
    const privateChat = this.privateChats.find(
      (chat) => chat.id === this.selectedChatId
    );
    if (!privateChat || !this.currentUser) return;

    // Get recipient ID (the other participant)
    const recipientId = privateChat.participants.find(
      (id: string) => id !== this.currentUser!.id
    );
    if (!recipientId) return;

    this.chatService
      .sendPrivateMessage(recipientId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Private message sent successfully');
        },
        error: (error: any) => {
          console.error('Failed to send private message:', error);
        },
      });
  }

  private addMessageLocally(content: string) {
    // Fallback method for demo when server is not available
    if (!this.currentUser) return;

    const userMessage: Message = {
      id: this.messages.length + 1,
      text: content,
      username: this.currentUserDisplayName,
      userId: this.currentUser.id,
      timestamp: new Date(),
      country: this.currentUserCountry,
      isOwnMessage: true,
    };

    this.messages.push(userMessage);
    this.scrollToBottom();
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Chat Navigation Event Handlers
  onChatTypeChange(chatType: ChatType) {
    this.activeChatType = chatType;
    this.selectedChatId = null;

    if (chatType === 'world') {
      // Load world messages if not already loaded
      this.messages = this.convertChatMessagesToMessages(
        this.chatService.getCurrentWorldMessages()
      );
    }
  }

  onChatSelect(chat: ChatRoom) {
    this.selectedChatId = chat.id;

    if (chat.type === 'group') {
      this.loadGroupMessages(chat.id);
    } else if (chat.type === 'private') {
      this.loadPrivateMessages(chat.id);
    }
  }

  onCreateGroup() {
    // TODO: Open create group modal/dialog
    console.log('Create group clicked');
  }

  onStartPrivateChat() {
    // TODO: Open user selection modal/dialog
    console.log('Start private chat clicked');
  }

  onStartPrivateChatWithUser(user: OnlineUser) {
    this.chatService
      .startPrivateChat(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chatRoom: ChatRoom) => {
          console.log('Private chat started with', user.username);
          this.activeChatType = 'private';
          this.selectedChatId = chatRoom.id;
          this.loadPrivateMessages(chatRoom.id);
        },
        error: (error: any) => {
          console.error('Failed to start private chat:', error);
        },
      });
  }

  private loadGroupMessages(groupId: string) {
    this.chatService
      .loadGroupMessages(groupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chatMessages: ChatMessage[]) => {
          this.messages = this.convertChatMessagesToMessages(chatMessages);
          this.scrollToBottom();
        },
        error: (error: any) => {
          console.error('Failed to load group messages:', error);
        },
      });
  }

  private loadPrivateMessages(chatId: string) {
    this.chatService
      .loadPrivateMessages(chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chatMessages: ChatMessage[]) => {
          this.messages = this.convertChatMessagesToMessages(chatMessages);
          this.scrollToBottom();
        },
        error: (error: any) => {
          console.error('Failed to load private messages:', error);
        },
      });
  }

  // Profile menu methods
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onSettingsClick() {
    this.isMenuOpen = false;
    this.router.navigate(['/settings']);
  }

  onHelpClick() {
    this.isMenuOpen = false;
    window.open('https://your-help-url.com', '_blank');
  }

  onLogoutClick() {
    this.isMenuOpen = false;
    this.authService.logout();
  }

  onGoToLogin() {
    this.authService.logout();
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  // Get connection status for display
  get connectionStatus(): string {
    return this.isConnected ? 'Connected' : 'Connecting...';
  }

  // Get current chat title for header
  get currentChatTitle(): string {
    if (this.activeChatType === 'world') {
      return 'World Chat';
    } else if (this.selectedChatId) {
      if (this.activeChatType === 'groups') {
        const group = this.groups.find((g) => g.id === this.selectedChatId);
        return group ? group.name : 'Group Chat';
      } else if (this.activeChatType === 'private') {
        const chat = this.privateChats.find(
          (c) => c.id === this.selectedChatId
        );
        return chat ? chat.name : 'Private Chat';
      }
    }
    return 'GlobalChat';
  }

  // Get current message placeholder
  get messagePlaceholder(): string {
    if (this.activeChatType === 'world') {
      return 'Share your message with the world...';
    } else if (this.activeChatType === 'groups') {
      return 'Send a message to the group...';
    } else if (this.activeChatType === 'private') {
      return 'Send a private message...';
    }
    return 'Type a message...';
  }
}
