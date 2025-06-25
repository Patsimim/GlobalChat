// chat-navigation.component.ts
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

export interface ChatType {
  id: string;
  name: string;
  icon: string;
  description: string;
  count?: number;
}

export interface GroupChat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  avatar?: string;
}

export interface PrivateChat {
  id: string;
  username: string;
  country: string;
  lastMessage: string;
  timestamp: Date;
  isOnline: boolean;
  unreadCount: number;
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
          <div class="logo">
            <mat-icon class="logo-icon">forum</mat-icon>
            <span class="logo-text" *ngIf="!isCollapsed">GlobalChat</span>
          </div>
        </div>

        <!-- Chat Types -->
        <div class="nav-section">
          <div class="section-header" *ngIf="!isCollapsed">
            <span>Chat Types</span>
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
                <div class="chat-last-message">{{ group.lastMessage }}</div>
              </div>
              <div class="chat-meta">
                <div class="chat-time">
                  {{ group.timestamp | date : 'HH:mm' }}
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
                  [class.online]="chat.isOnline"
                ></div>
                <span class="flag">{{ chat.country }}</span>
              </div>
              <div class="chat-info">
                <div class="chat-name">{{ chat.username }}</div>
                <div class="chat-last-message">{{ chat.lastMessage }}</div>
              </div>
              <div class="chat-meta">
                <div class="chat-time">
                  {{ chat.timestamp | date : 'HH:mm' }}
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
export class ChatNavigationComponent implements OnInit {
  @Input() isMobile: boolean = false;
  @Output() chatTypeChanged = new EventEmitter<string>();
  @Output() chatSelected = new EventEmitter<{ type: string; id: string }>();

  isCollapsed: boolean = false;
  activeChatType: string = 'world';
  activeChat: string = '';

  chatTypes: ChatType[] = [
    {
      id: 'world',
      name: 'World Chat',
      icon: 'public',
      description: 'Chat with everyone worldwide',
      count: 1247,
    },
    {
      id: 'groups',
      name: 'Group Chats',
      icon: 'group',
      description: 'Join or create group conversations',
      count: 12,
    },
    {
      id: 'private',
      name: 'Private Messages',
      icon: 'person',
      description: 'One-on-one conversations',
      count: 5,
    },
  ];

  groupChats: GroupChat[] = [
    {
      id: 'group1',
      name: 'Tech Enthusiasts',
      lastMessage: 'Check out this new framework!',
      timestamp: new Date(Date.now() - 300000),
      unreadCount: 3,
    },
    {
      id: 'group2',
      name: 'Travel Buddies',
      lastMessage: 'Anyone been to Japan recently?',
      timestamp: new Date(Date.now() - 600000),
      unreadCount: 0,
    },
    {
      id: 'group3',
      name: 'Language Exchange',
      lastMessage: 'Hola! ¿Cómo están todos?',
      timestamp: new Date(Date.now() - 900000),
      unreadCount: 7,
    },
  ];

  privateChats: PrivateChat[] = [
    {
      id: 'user1',
      username: 'SakuraUser',
      country: '🇯🇵',
      lastMessage: 'Thanks for the help!',
      timestamp: new Date(Date.now() - 180000),
      isOnline: true,
      unreadCount: 2,
    },
    {
      id: 'user2',
      username: 'NYCExplorer',
      country: '🇺🇸',
      lastMessage: 'See you tomorrow!',
      timestamp: new Date(Date.now() - 420000),
      isOnline: false,
      unreadCount: 0,
    },
    {
      id: 'user3',
      username: 'LondonVibes',
      country: '🇬🇧',
      lastMessage: 'The weather is lovely today',
      timestamp: new Date(Date.now() - 720000),
      isOnline: true,
      unreadCount: 1,
    },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Check if it's mobile view
    this.checkMobileView();

    // Listen for window resize
    window.addEventListener('resize', () => {
      this.checkMobileView();
    });
  }

  checkMobileView() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  toggleNavigation() {
    this.isCollapsed = !this.isCollapsed;
  }

  closeNavigation() {
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  selectChatType(chatTypeId: string) {
    this.activeChatType = chatTypeId;
    this.activeChat = '';
    this.chatTypeChanged.emit(chatTypeId);

    // Auto-collapse on mobile after selection
    if (this.isMobile && chatTypeId === 'world') {
      this.isCollapsed = true;
    }
  }

  selectChat(type: string, chatId: string) {
    this.activeChat = chatId;
    this.chatSelected.emit({ type, id: chatId });

    // Auto-collapse on mobile after selection
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  createNewGroup() {
    // Emit event or navigate to create group page
    console.log('Create new group');
  }

  startNewChat() {
    // Emit event or navigate to start new chat page
    console.log('Start new chat');
  }

  openSettings() {
    this.router.navigate(['/settings']);
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  openProfile() {
    // Open profile modal or navigate to profile page
    console.log('Open profile');
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }
}
