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
import { SettingOptionComponent } from '../../setting-option/setting-option';

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
  imports: [CommonModule, MatIconModule, SettingOptionComponent],
  templateUrl: './chat-navigation.component.html',
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

  isSettingsModalOpen: boolean = false;

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

  onSettingsClick(): void {
    this.isSettingsModalOpen = true;
  }

  onSettingsClose(): void {
    this.isSettingsModalOpen = false;
  }
}
