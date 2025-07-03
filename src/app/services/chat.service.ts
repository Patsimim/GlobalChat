// chat.service.ts - Complete service with group creation functionality
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { io, Socket } from 'socket.io-client';

export interface ApiMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderCountry: string;
  senderAvatar?: string;
  timestamp: Date;
  updatedAt: Date;
  chatType: 'world' | 'group' | 'private';
  chatId?: string;
  messageType: string;
  isOwnMessage: boolean;
  deliveredTo: string[];
  readBy: string[];
  editedAt?: Date;
  isEdited: boolean;
}

export interface ApiChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'group' | 'private';
  participants: Array<{
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
    country: string;
  }>;
  admins?: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: string;
    senderName: string;
  };
  avatar?: string;
  memberCount?: number;
  unreadCount: number;
}

export interface ApiUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  country: string;
  isOnline: boolean;
  avatar?: string;
  lastSeen?: Date;
}

export interface ChatStats {
  totalMessages: number;
  groupCount: number;
  privateChatsCount: number;
  todayMessages: number;
  joinedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl: string;
  private socket: Socket | null = null;

  // Subjects for real-time updates
  private worldMessagesSubject = new BehaviorSubject<ApiMessage[]>([]);
  private groupChatsSubject = new BehaviorSubject<ApiChatRoom[]>([]);
  private privateChatsSubject = new BehaviorSubject<ApiChatRoom[]>([]);
  private onlineUsersSubject = new BehaviorSubject<ApiUser[]>([]);

  // Message subjects for each chat
  private groupMessagesSubjects = new Map<
    string,
    BehaviorSubject<ApiMessage[]>
  >();
  private privateMessagesSubjects = new Map<
    string,
    BehaviorSubject<ApiMessage[]>
  >();

  // Socket event subjects
  private socketConnectedSubject = new BehaviorSubject<boolean>(false);
  private newMessageSubject = new Subject<{
    type: string;
    message: ApiMessage;
  }>();

  constructor(private http: HttpClient, private authService: AuthService) {
    this.apiUrl = this.authService.getApiUrl();
    this.initializeSocket();
  }

  // Socket.IO connection
  private initializeSocket() {
    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io(this.apiUrl.replace('/api', ''), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socketConnectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.socketConnectedSubject.next(false);
    });

    // World chat messages
    this.socket.on(
      'world_message',
      (data: { type: string; message: ApiMessage }) => {
        const currentMessages = this.worldMessagesSubject.value;
        this.worldMessagesSubject.next([...currentMessages, data.message]);
        this.newMessageSubject.next(data);
      }
    );

    // Group messages
    this.socket.on(
      'group_message',
      (data: { type: string; message: ApiMessage }) => {
        const chatId = data.message.chatId;
        if (chatId && this.groupMessagesSubjects.has(chatId)) {
          const currentMessages = this.groupMessagesSubjects.get(chatId)!.value;
          this.groupMessagesSubjects
            .get(chatId)!
            .next([...currentMessages, data.message]);
        }
        this.newMessageSubject.next(data);
      }
    );

    // Private messages
    this.socket.on(
      'private_message',
      (data: { type: string; message: ApiMessage }) => {
        const chatId = data.message.chatId;
        if (chatId && this.privateMessagesSubjects.has(chatId)) {
          const currentMessages =
            this.privateMessagesSubjects.get(chatId)!.value;
          this.privateMessagesSubjects
            .get(chatId)!
            .next([...currentMessages, data.message]);
        }
        this.newMessageSubject.next(data);
      }
    );

    // Setup group socket events
    this.setupGroupSocketEvents();

    // Private chat created
    this.socket.on('private_chat_created', (data: { chat: ApiChatRoom }) => {
      const currentChats = this.privateChatsSubject.value;
      this.privateChatsSubject.next([data.chat, ...currentChats]);
    });

    // Online users updates
    this.socket.on('users_online_update', (data: { users: ApiUser[] }) => {
      this.onlineUsersSubject.next(data.users);
    });
  }

  // Setup group-specific socket events
  private setupGroupSocketEvents() {
    if (!this.socket) return;

    // Group created
    this.socket.on('group_created', (data: { group: ApiChatRoom }) => {
      console.log('Group created via socket:', data.group);
      const currentGroups = this.groupChatsSubject.value;
      const exists = currentGroups.find((g) => g.id === data.group.id);
      if (!exists) {
        this.groupChatsSubject.next([data.group, ...currentGroups]);
      }
    });

    // Group updated
    this.socket.on('group_updated', (data: { group: ApiChatRoom }) => {
      const currentGroups = this.groupChatsSubject.value;
      const updatedGroups = currentGroups.map((group) =>
        group.id === data.group.id ? data.group : group
      );
      this.groupChatsSubject.next(updatedGroups);
    });

    // Group deleted
    this.socket.on('group_deleted', (data: { groupId: string }) => {
      const currentGroups = this.groupChatsSubject.value;
      const updatedGroups = currentGroups.filter(
        (group) => group.id !== data.groupId
      );
      this.groupChatsSubject.next(updatedGroups);
    });

    // Participant added to group
    this.socket.on(
      'group_participant_added',
      (data: { groupId: string; participant: ApiUser; group: ApiChatRoom }) => {
        const currentGroups = this.groupChatsSubject.value;
        const updatedGroups = currentGroups.map((group) =>
          group.id === data.groupId ? data.group : group
        );
        this.groupChatsSubject.next(updatedGroups);
      }
    );

    // Participant removed from group
    this.socket.on(
      'group_participant_removed',
      (data: {
        groupId: string;
        participantId: string;
        group: ApiChatRoom;
      }) => {
        const currentGroups = this.groupChatsSubject.value;
        const updatedGroups = currentGroups.map((group) =>
          group.id === data.groupId ? data.group : group
        );
        this.groupChatsSubject.next(updatedGroups);
      }
    );
  }

  // Observables for components
  get worldMessages$() {
    return this.worldMessagesSubject.asObservable();
  }
  get groupChats$() {
    return this.groupChatsSubject.asObservable();
  }
  get privateChats$() {
    return this.privateChatsSubject.asObservable();
  }
  get onlineUsers$() {
    return this.onlineUsersSubject.asObservable();
  }
  get socketConnected$() {
    return this.socketConnectedSubject.asObservable();
  }
  get newMessage$() {
    return this.newMessageSubject.asObservable();
  }

  // Get messages for specific group/private chat
  getGroupMessages$(groupId: string): Observable<ApiMessage[]> {
    if (!this.groupMessagesSubjects.has(groupId)) {
      this.groupMessagesSubjects.set(
        groupId,
        new BehaviorSubject<ApiMessage[]>([])
      );
    }
    return this.groupMessagesSubjects.get(groupId)!.asObservable();
  }

  getPrivateMessages$(chatId: string): Observable<ApiMessage[]> {
    if (!this.privateMessagesSubjects.has(chatId)) {
      this.privateMessagesSubjects.set(
        chatId,
        new BehaviorSubject<ApiMessage[]>([])
      );
    }
    return this.privateMessagesSubjects.get(chatId)!.asObservable();
  }

  // WORLD CHAT API CALLS
  loadWorldMessages(
    limit = 50,
    skip = 0,
    before?: string
  ): Observable<{ success: boolean; messages: ApiMessage[]; pagination: any }> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('skip', skip.toString());

    if (before) {
      params = params.set('before', before);
    }

    return this.http.get<{
      success: boolean;
      messages: ApiMessage[];
      pagination: any;
    }>(`${this.apiUrl}/chat/world/messages`, {
      params,
      headers: this.getAuthHeaders(),
    });
  }

  sendWorldMessage(
    content: string
  ): Observable<{ success: boolean; message: ApiMessage }> {
    return this.http.post<{ success: boolean; message: ApiMessage }>(
      `${this.apiUrl}/chat/world/messages`,
      { content },
      { headers: this.getAuthHeaders() }
    );
  }

  // GROUP CHAT API CALLS
  loadGroupChats(): Observable<{
    success: boolean;
    groups: ApiChatRoom[];
    count: number;
  }> {
    return this.http.get<{
      success: boolean;
      groups: ApiChatRoom[];
      count: number;
    }>(`${this.apiUrl}/chat/groups`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Create a new group chat with FormData (supports file uploads)
   */
  createGroup(formData: FormData): Observable<{
    success: boolean;
    group?: ApiChatRoom;
    message?: string;
  }> {
    // For FormData, don't set Content-Type header - let browser handle it
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });

    return this.http
      .post<any>(`${this.apiUrl}/chat/groups`, formData, {
        headers,
      })
      .pipe(
        tap((response) => {
          if (response.success && response.group) {
            // Add the new group to local state
            const currentGroups = this.groupChatsSubject.value;
            this.groupChatsSubject.next([response.group, ...currentGroups]);

            // Emit group created event via socket if connected
            if (this.socket?.connected) {
              this.socket.emit('group_created', {
                groupId: response.group.id,
                groupName: response.group.name,
              });
            }
          }
        }),
        catchError((error) => {
          console.error('Error creating group:', error);
          return of({
            success: false,
            message: error.error?.message || 'Failed to create group',
          });
        })
      );
  }

  /**
   * Create group with simple object (keeping existing method for backward compatibility)
   */
  createGroupSimple(
    name: string,
    participants: string[] = [],
    description?: string
  ): Observable<{ success: boolean; group: ApiChatRoom; message?: string }> {
    return this.http
      .post<{ success: boolean; group: ApiChatRoom; message?: string }>(
        `${this.apiUrl}/chat/groups`,
        {
          name,
          participants,
          description,
        },
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.group) {
            const currentGroups = this.groupChatsSubject.value;
            this.groupChatsSubject.next([response.group, ...currentGroups]);
          }
        }),
        catchError((error) => {
          console.error('Error creating group:', error);
          return of({
            success: false,
            group: {} as ApiChatRoom,
            message: error.error?.message || 'Failed to create group',
          });
        })
      );
  }

  loadGroupMessages(
    groupId: string,
    limit = 50,
    skip = 0,
    before?: string
  ): Observable<{ success: boolean; messages: ApiMessage[]; pagination: any }> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('skip', skip.toString());

    if (before) {
      params = params.set('before', before);
    }

    return this.http.get<{
      success: boolean;
      messages: ApiMessage[];
      pagination: any;
    }>(`${this.apiUrl}/chat/groups/${groupId}/messages`, {
      params,
      headers: this.getAuthHeaders(),
    });
  }

  sendGroupMessage(
    groupId: string,
    content: string
  ): Observable<{ success: boolean; message: ApiMessage }> {
    return this.http.post<{ success: boolean; message: ApiMessage }>(
      `${this.apiUrl}/chat/groups/${groupId}/messages`,
      { content },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get group information by ID
   */
  getGroupInfo(groupId: string): Observable<{
    success: boolean;
    group?: ApiChatRoom;
    message?: string;
  }> {
    return this.http
      .get<any>(`${this.apiUrl}/chat/groups/${groupId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error getting group info:', error);
          return of({
            success: false,
            message: 'Failed to get group information',
          });
        })
      );
  }

  /**
   * Add participants to an existing group
   */
  addGroupParticipants(
    groupId: string,
    userIds: string[]
  ): Observable<{
    success: boolean;
    message?: string;
  }> {
    const body = { userIds };

    return this.http
      .post<any>(`${this.apiUrl}/chat/groups/${groupId}/participants`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            // Refresh group data
            this.loadGroupChats().subscribe();
          }
        }),
        catchError((error) => {
          console.error('Error adding group participants:', error);
          return of({
            success: false,
            message: 'Failed to add participants',
          });
        })
      );
  }

  /**
   * Remove participant from group
   */
  removeGroupParticipant(
    groupId: string,
    userId: string
  ): Observable<{
    success: boolean;
    message?: string;
  }> {
    return this.http
      .delete<any>(
        `${this.apiUrl}/chat/groups/${groupId}/participants/${userId}`,
        {
          headers: this.getAuthHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            // Refresh group data
            this.loadGroupChats().subscribe();
          }
        }),
        catchError((error) => {
          console.error('Error removing group participant:', error);
          return of({
            success: false,
            message: 'Failed to remove participant',
          });
        })
      );
  }

  /**
   * Leave a group
   */
  leaveGroup(groupId: string): Observable<{
    success: boolean;
    message?: string;
  }> {
    return this.http
      .post<any>(
        `${this.apiUrl}/chat/groups/${groupId}/leave`,
        {},
        {
          headers: this.getAuthHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            // Remove group from local state
            const currentGroups = this.groupChatsSubject.value;
            const updatedGroups = currentGroups.filter(
              (group) => group.id !== groupId
            );
            this.groupChatsSubject.next(updatedGroups);

            // Leave socket room
            this.leaveRoom('group', groupId);
          }
        }),
        catchError((error) => {
          console.error('Error leaving group:', error);
          return of({
            success: false,
            message: 'Failed to leave group',
          });
        })
      );
  }

  /**
   * Update group information
   */
  updateGroup(
    groupId: string,
    updates: {
      name?: string;
      description?: string;
    }
  ): Observable<{
    success: boolean;
    group?: ApiChatRoom;
    message?: string;
  }> {
    return this.http
      .put<any>(`${this.apiUrl}/chat/groups/${groupId}`, updates, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          if (response.success && response.group) {
            // Update local state
            const currentGroups = this.groupChatsSubject.value;
            const updatedGroups = currentGroups.map((group) =>
              group.id === groupId ? response.group : group
            );
            this.groupChatsSubject.next(updatedGroups);
          }
        }),
        catchError((error) => {
          console.error('Error updating group:', error);
          return of({
            success: false,
            message: 'Failed to update group',
          });
        })
      );
  }

  /**
   * Delete/disband a group (admin only)
   */
  deleteGroup(groupId: string): Observable<{
    success: boolean;
    message?: string;
  }> {
    return this.http
      .delete<any>(`${this.apiUrl}/chat/groups/${groupId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            // Remove group from local state
            const currentGroups = this.groupChatsSubject.value;
            const updatedGroups = currentGroups.filter(
              (group) => group.id !== groupId
            );
            this.groupChatsSubject.next(updatedGroups);

            // Leave socket room
            this.leaveRoom('group', groupId);
          }
        }),
        catchError((error) => {
          console.error('Error deleting group:', error);
          return of({
            success: false,
            message: 'Failed to delete group',
          });
        })
      );
  }

  // PRIVATE CHAT API CALLS
  loadPrivateChats(): Observable<{
    success: boolean;
    chats: ApiChatRoom[];
    count: number;
  }> {
    return this.http.get<{
      success: boolean;
      chats: ApiChatRoom[];
      count: number;
    }>(`${this.apiUrl}/chat/private`, {
      headers: this.getAuthHeaders(),
    });
  }

  startPrivateChat(
    participantId: string
  ): Observable<{ success: boolean; chat: ApiChatRoom; isNew: boolean }> {
    return this.http.post<{
      success: boolean;
      chat: ApiChatRoom;
      isNew: boolean;
    }>(
      `${this.apiUrl}/chat/private/start`,
      { participantId },
      { headers: this.getAuthHeaders() }
    );
  }

  loadPrivateMessages(
    chatId: string,
    limit = 50,
    skip = 0,
    before?: string
  ): Observable<{ success: boolean; messages: ApiMessage[]; pagination: any }> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('skip', skip.toString());

    if (before) {
      params = params.set('before', before);
    }

    return this.http.get<{
      success: boolean;
      messages: ApiMessage[];
      pagination: any;
    }>(`${this.apiUrl}/chat/private/${chatId}/messages`, {
      params,
      headers: this.getAuthHeaders(),
    });
  }

  sendPrivateMessage(
    recipientId: string,
    content: string
  ): Observable<{ success: boolean; message: ApiMessage; chatId: string }> {
    return this.http.post<{
      success: boolean;
      message: ApiMessage;
      chatId: string;
    }>(
      `${this.apiUrl}/chat/private/messages`,
      {
        recipientId,
        content,
      },
      { headers: this.getAuthHeaders() }
    );
  }

  // USER AND STATUS API CALLS
  loadOnlineUsers(): Observable<{
    success: boolean;
    users: ApiUser[];
    count: number;
    socketCount: number;
  }> {
    return this.http.get<{
      success: boolean;
      users: ApiUser[];
      count: number;
      socketCount: number;
    }>(`${this.apiUrl}/chat/online-users`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Search for users by username or email
   */
  searchUsers(query: string): Observable<{
    success: boolean;
    users: ApiUser[];
    count: number;
    message?: string;
  }> {
    const params = new HttpParams().set('q', query).set('limit', '20');

    return this.http
      .get<any>(`${this.apiUrl}/chat/search/users`, {
        params,
        headers: this.getAuthHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error searching users:', error);
          return of({
            success: false,
            users: [],
            count: 0,
            message: 'Failed to search users',
          });
        })
      );
  }

  getChatStats(): Observable<{ success: boolean; stats: ChatStats }> {
    return this.http.get<{ success: boolean; stats: ChatStats }>(
      `${this.apiUrl}/chat/stats`,
      { headers: this.getAuthHeaders() }
    );
  }

  // SOCKET ROOM MANAGEMENT
  joinRoom(roomType: 'world' | 'group' | 'private', roomId?: string) {
    if (!this.socket || !this.socket.connected) return;

    if (roomType === 'world') {
      this.socket.emit('join_world_chat');
    } else if (roomType === 'group' && roomId) {
      this.socket.emit('join_group', { groupId: roomId });
    } else if (roomType === 'private' && roomId) {
      this.socket.emit('join_private_chat', { chatId: roomId });
    }
  }

  leaveRoom(roomType: 'world' | 'group' | 'private', roomId?: string) {
    if (!this.socket || !this.socket.connected) return;

    if (roomType === 'world') {
      this.socket.emit('leave_world_chat');
    } else if (roomType === 'group' && roomId) {
      this.socket.emit('leave_group', { groupId: roomId });
    } else if (roomType === 'private' && roomId) {
      this.socket.emit('leave_private_chat', { chatId: roomId });
    }
  }

  // HELPER METHODS
  updateLocalWorldMessages(messages: ApiMessage[]) {
    this.worldMessagesSubject.next(messages);
  }

  updateLocalGroupMessages(groupId: string, messages: ApiMessage[]) {
    if (!this.groupMessagesSubjects.has(groupId)) {
      this.groupMessagesSubjects.set(
        groupId,
        new BehaviorSubject<ApiMessage[]>([])
      );
    }
    this.groupMessagesSubjects.get(groupId)!.next(messages);
  }

  updateLocalPrivateMessages(chatId: string, messages: ApiMessage[]) {
    if (!this.privateMessagesSubjects.has(chatId)) {
      this.privateMessagesSubjects.set(
        chatId,
        new BehaviorSubject<ApiMessage[]>([])
      );
    }
    this.privateMessagesSubjects.get(chatId)!.next(messages);
  }

  updateLocalGroupChats(groups: ApiChatRoom[]) {
    this.groupChatsSubject.next(groups);
  }

  updateLocalPrivateChats(chats: ApiChatRoom[]) {
    this.privateChatsSubject.next(chats);
  }

  updateLocalOnlineUsers(users: ApiUser[]) {
    this.onlineUsersSubject.next(users);
  }

  /**
   * Get auth headers for HTTP requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // SOCKET CONNECTION MANAGEMENT
  connectSocket() {
    if (!this.socket) {
      this.initializeSocket();
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }

  // CLEANUP
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
