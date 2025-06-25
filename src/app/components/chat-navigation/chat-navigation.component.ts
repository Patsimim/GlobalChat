// chat-navigation.component.ts
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ApiChatRoom, ApiUser } from '../../services/chat.service';

export interface ChatType {
  id: string;
  name: string;
  icon: string;
  description: string;
  count?: number;
}

@Component({
  selector: 'app-chat-navigation',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="chat-nav-container" [class.collapsed]="isCollapsed">
      <!-- Toggle Button -->
      <button class="nav-toggle" (click)="toggleNavigation()">
        <mat-icon>{{ isCollapsed ? 'menu' : 'close' }}</mat-icon>
      </button>

      <!-- Navigation Content -->
      <div class="nav-content" [class.show]="!isCollapsed">
        <!-- Header -->
        <div class="nav-header">
          <div class="nav-items chat-list">
            <button
              *ngFor="let chat of privateChats"
              class="chat-item"
              [class.active]="activeChat === chat.id"
              (click)="selectChat('private', chat.id)"
            >
              <div class="chat-avatar">
                <div
                  class="status-indicator"
                  [class.online]="isPrivateUserOnline(chat)"
                ></div>
                <span class="flag">{{ getPrivateUserCountry(chat) }}</span>
              </div>
              <div class="chat-info">
                <div class="chat-name">{{ getPrivateUserName(chat) }}</div>
                <div class="chat-last-message">
                  {{ getPrivateLastMessage(chat) }}
                </div>
              </div>
              <div class="chat-meta">
                <div class="chat-time">
                  {{ getPrivateTimestamp(chat) | date : 'HH:mm' }}
                </div>
                <div class="unread-badge" *ngIf="chat.unreadCount > 0">
                  {{ chat.unreadCount }}
                </div>
              </div>
            </button>
          </div>
          <div class="logo">
            <mat-icon class="logo-icon">forum</mat-icon>
            <span class="logo-text" *ngIf="!isCollapsed">GlobalChat</span>
          </div>
        </div>

        <!-- Chat Types -->
        <div class="nav-section">
          <div class="section-header" *ngIf="!isCollapsed">
            <span>Chat Mode</span>
          </div>

          <div class="nav-items">
            <button
              *ngFor="let chatType of chatTypes"
              class="nav-item"
              [class.active]="activeChatType === chatType.id"
              (click)="selectChatType(chatType.id)"
              [title]="isCollapsed ? chatType.name : ''"
            >
              <mat-icon>{{ chatType.icon }}</mat-icon>
              <span class="item-text" *ngIf="!isCollapsed">{{
                chatType.name
              }}</span>
              <span class="item-count" *ngIf="!isCollapsed && chatType.count">
                {{ chatType.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- Group Chats (only show when Groups is selected) -->
        <div
          class="nav-section"
          *ngIf="activeChatType === 'groups' && !isCollapsed"
        >
          <div class="section-header">
            <span>Group Chats</span>
            <button class="create-btn" (click)="createNewGroup()">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <div class="nav-items chat-list">
            <button
              *ngFor="let group of groupChats"
              class="chat-item"
              [class.active]="activeChat === group.id"
              (click)="selectChat('group', group.id)"
            >
              <div class="chat-avatar">
                <mat-icon>group</mat-icon>
              </div>
              <div class="chat-info">
                <div class="chat-name">{{ group.name }}</div>
                <div class="chat-last-message">
                  {{ getGroupLastMessage(group) }}
                </div>
              </div>
              <div class="chat-meta">
                <div class="chat-time">
                  {{ getGroupTimestamp(group) | date : 'HH:mm' }}
                </div>
                <div class="unread-badge" *ngIf="group.unreadCount > 0">
                  {{ group.unreadCount }}
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Private Chats (only show when Private is selected) -->
        <div
          class="nav-section"
          *ngIf="activeChatType === 'private' && !isCollapsed"
        >
          <div class="section-header">
            <span>Private Messages</span>
            <button class="create-btn" (click)="startNewChat()">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <div class="nav-items chat-list">
            <button
              *ngFor="let chat of privateChats"
              class="chat-item"
              [class.active]="activeChat === chat.id"
              (click)="selectChat('private', chat.id)"
            >
              <div class="chat-avatar">
                <div
                  class="status-indicator"
                  [class.online]="isPrivateUserOnline(chat)"
                ></div>
                <span class="flag">{{ getPrivateUserCountry(chat) }}</span>
              </div>
              <div class="chat-info">
                <div class="chat-name">{{ getPrivateUserName(chat) }}</div>
                <div class="chat-last-message">
                  {{ getPrivateLastMessage(chat) }}
                </div>
              </div>
              <div class="chat-meta">
                <div class="chat-time">
                  {{ getPrivateTimestamp(chat) | date : 'HH:mm' }}
                </div>
                <div class="unread-badge" *ngIf="chat.unreadCount > 0">
                  {{ chat.unreadCount }}
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Settings and User Profile -->
        <div class="nav-footer" *ngIf="!isCollapsed">
          <button class="nav-item" (click)="openSettings()">
            <mat-icon>settings</mat-icon>
            <span class="item-text">Settings</span>
          </button>

          <button class="nav-item" (click)="openProfile()">
            <mat-icon>account_circle</mat-icon>
            <span class="item-text">Profile</span>
          </button>
        </div>
      </div>

      <!-- Overlay for mobile -->
      <div
        class="nav-overlay"
        *ngIf="!isCollapsed && isMobile"
        (click)="closeNavigation()"
      ></div>
    </div>
  `,
  styleUrls: ['./chat-navigation.component.scss'],
})
export class ChatNavigationComponent implements OnInit, OnDestroy {
  @Input() isMobile: boolean = false;
  @Output() chatTypeChanged = new EventEmitter<string>();
  @Output() chatSelected = new EventEmitter<{ type: string; id: string }>();
  @Output() navigationStateChanged = new EventEmitter<{
    isCollapsed: boolean;
    width: number;
  }>();

  private destroy$ = new Subject<void>();

  isCollapsed: boolean = false;
  activeChatType: string = 'world';
  activeChat: string = '';
  onlineUsersCount: number = 0;

  chatTypes: ChatType[] = [
    {
      id: 'world',
      name: 'World Chat',
      icon: 'public',
      description: 'Chat with everyone worldwide',
      count: 0,
    },
    {
      id: 'groups',
      name: 'Group Chats',
      icon: 'group',
      description: 'Join or create group conversations',
      count: 0,
    },
    {
      id: 'private',
      name: 'Private Messages',
      icon: 'person',
      description: 'One-on-one conversations',
      count: 0,
    },
  ];

  groupChats: ApiChatRoom[] = [];
  privateChats: ApiChatRoom[] = [];
  onlineUsers: ApiUser[] = [];

  constructor(private router: Router, private chatService: ChatService) {}

  ngOnInit() {
    // Check if it's mobile view
    this.checkMobileView();

    // Listen for window resize
    window.addEventListener('resize', () => {
      this.checkMobileView();
    });

    // Emit initial state
    this.emitNavigationState();

    // Load initial data
    this.loadChatData();

    // Subscribe to real-time updates
    this.subscribeToUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadChatData() {
    // Load group chats
    this.chatService
      .loadGroupChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.groupChats = response.groups;
            this.updateChatTypeCount('groups', response.count);
          }
        },
        error: (error) => console.error('Error loading group chats:', error),
      });

    // Load private chats
    this.chatService
      .loadPrivateChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.privateChats = response.chats;
            this.updateChatTypeCount('private', response.count);
          }
        },
        error: (error) => console.error('Error loading private chats:', error),
      });

    // Load online users
    this.chatService
      .loadOnlineUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.onlineUsers = response.users;
            this.onlineUsersCount = response.count;
            this.updateChatTypeCount('world', response.count);
          }
        },
        error: (error) => console.error('Error loading online users:', error),
      });
  }

  private subscribeToUpdates() {
    // Subscribe to group chats updates
    this.chatService.groupChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((groups) => {
        this.groupChats = groups;
        this.updateChatTypeCount('groups', groups.length);
      });

    // Subscribe to private chats updates
    this.chatService.privateChats$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chats) => {
        this.privateChats = chats;
        this.updateChatTypeCount('private', chats.length);
      });

    // Subscribe to online users updates
    this.chatService.onlineUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((users) => {
        this.onlineUsers = users;
        this.onlineUsersCount = users.length;
        this.updateChatTypeCount('world', users.length);
      });
  }

  private updateChatTypeCount(chatType: string, count: number) {
    const type = this.chatTypes.find((t) => t.id === chatType);
    if (type) {
      type.count = count;
    }
  }

  checkMobileView() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.isCollapsed = true;
    }
    this.emitNavigationState();
  }

  toggleNavigation() {
    this.isCollapsed = !this.isCollapsed;
    this.emitNavigationState();
  }

  closeNavigation() {
    if (this.isMobile) {
      this.isCollapsed = true;
      this.emitNavigationState();
    }
  }

  private emitNavigationState() {
    const width = this.isMobile ? 0 : this.isCollapsed ? 60 : 320;
    this.navigationStateChanged.emit({
      isCollapsed: this.isCollapsed,
      width: width,
    });
  }

  selectChatType(chatTypeId: string) {
    this.activeChatType = chatTypeId;
    this.activeChat = '';
    this.chatTypeChanged.emit(chatTypeId);

    // Auto-collapse on mobile after selection
    if (this.isMobile && chatTypeId === 'world') {
      this.isCollapsed = true;
      this.emitNavigationState();
    }
  }

  selectChat(type: string, chatId: string) {
    this.activeChat = chatId;
    this.chatSelected.emit({ type, id: chatId });

    // Auto-collapse on mobile after selection
    if (this.isMobile) {
      this.isCollapsed = true;
      this.emitNavigationState();
    }
  }

  createNewGroup() {
    // Navigate to create group page or open modal
    console.log('Create new group');
    // You can implement a modal or navigate to a create group page
    // this.router.navigate(['/chat/create-group']);
  }

  startNewChat() {
    // Navigate to user search page or open modal
    console.log('Start new chat');
    // You can implement a modal or navigate to a user search page
    // this.router.navigate(['/chat/search-users']);
  }

  // Helper methods for template
  getGroupLastMessage(group: ApiChatRoom): string {
    return group.lastMessage?.content || 'No messages yet';
  }

  getGroupTimestamp(group: ApiChatRoom): Date {
    return group.lastMessage?.timestamp || group.updatedAt;
  }

  getPrivateUserName(chat: ApiChatRoom): string {
    return chat.name;
  }

  getPrivateUserCountry(chat: ApiChatRoom): string {
    const participant = chat.participants.find(
      (p) => p.id !== this.getCurrentUserId()
    );
    return participant?.country || '🌍';
  }

  getPrivateLastMessage(chat: ApiChatRoom): string {
    return chat.lastMessage?.content || 'No messages yet';
  }

  getPrivateTimestamp(chat: ApiChatRoom): Date {
    return chat.lastMessage?.timestamp || chat.updatedAt;
  }

  isPrivateUserOnline(chat: ApiChatRoom): boolean {
    const participant = chat.participants.find(
      (p) => p.id !== this.getCurrentUserId()
    );
    return participant?.isOnline || false;
  }

  private getCurrentUserId(): string {
    // You'll need to get this from your auth service
    // return this.authService.getCurrentUser()?.id || '';
    return ''; // Replace with actual implementation
  }

  openSettings() {
    this.router.navigate(['/settings']);
    if (this.isMobile) {
      this.isCollapsed = true;
      this.emitNavigationState();
    }
  }

  openProfile() {
    // Open profile modal or navigate to profile page
    console.log('Open profile');
    if (this.isMobile) {
      this.isCollapsed = true;
      this.emitNavigationState();
    }
  }
}
