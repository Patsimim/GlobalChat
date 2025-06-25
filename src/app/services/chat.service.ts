// chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
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

    // Group created
    this.socket.on('group_created', (data: { group: ApiChatRoom }) => {
      const currentGroups = this.groupChatsSubject.value;
      this.groupChatsSubject.next([data.group, ...currentGroups]);
    });

    // Private chat created
    this.socket.on('private_chat_created', (data: { chat: ApiChatRoom }) => {
      const currentChats = this.privateChatsSubject.value;
      this.privateChatsSubject.next([data.chat, ...currentChats]);
    });
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
    }>(`${this.apiUrl}/chat/world/messages`, { params });
  }

  sendWorldMessage(
    content: string
  ): Observable<{ success: boolean; message: ApiMessage }> {
    return this.http.post<{ success: boolean; message: ApiMessage }>(
      `${this.apiUrl}/chat/world/messages`,
      { content }
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
    }>(`${this.apiUrl}/chat/groups`);
  }

  createGroup(
    name: string,
    participants: string[] = [],
    description?: string
  ): Observable<{ success: boolean; group: ApiChatRoom }> {
    return this.http.post<{ success: boolean; group: ApiChatRoom }>(
      `${this.apiUrl}/chat/groups`,
      {
        name,
        participants,
        description,
      }
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
    }>(`${this.apiUrl}/chat/groups/${groupId}/messages`, { params });
  }

  sendGroupMessage(
    groupId: string,
    content: string
  ): Observable<{ success: boolean; message: ApiMessage }> {
    return this.http.post<{ success: boolean; message: ApiMessage }>(
      `${this.apiUrl}/chat/groups/${groupId}/messages`,
      { content }
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
    }>(`${this.apiUrl}/chat/private`);
  }

  startPrivateChat(
    participantId: string
  ): Observable<{ success: boolean; chat: ApiChatRoom; isNew: boolean }> {
    return this.http.post<{
      success: boolean;
      chat: ApiChatRoom;
      isNew: boolean;
    }>(`${this.apiUrl}/chat/private/start`, { participantId });
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
    }>(`${this.apiUrl}/chat/private/${chatId}/messages`, { params });
  }

  sendPrivateMessage(
    recipientId: string,
    content: string
  ): Observable<{ success: boolean; message: ApiMessage; chatId: string }> {
    return this.http.post<{
      success: boolean;
      message: ApiMessage;
      chatId: string;
    }>(`${this.apiUrl}/chat/private/messages`, {
      recipientId,
      content,
    });
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
    }>(`${this.apiUrl}/chat/online-users`);
  }

  searchUsers(
    query: string,
    limit = 10
  ): Observable<{
    success: boolean;
    users: ApiUser[];
    count: number;
    query: string;
  }> {
    const params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());

    return this.http.get<{
      success: boolean;
      users: ApiUser[];
      count: number;
      query: string;
    }>(`${this.apiUrl}/chat/search/users`, { params });
  }

  getChatStats(): Observable<{ success: boolean; stats: ChatStats }> {
    return this.http.get<{ success: boolean; stats: ChatStats }>(
      `${this.apiUrl}/chat/stats`
    );
  }

  // SOCKET ROOM MANAGEMENT
  joinRoom(roomType: 'world' | 'group' | 'private', roomId?: string) {
    if (!this.socket) return;

    if (roomType === 'world') {
      this.socket.emit('join_world_chat');
    } else if (roomType === 'group' && roomId) {
      this.socket.emit('join_group', { groupId: roomId });
    } else if (roomType === 'private' && roomId) {
      this.socket.emit('join_private_chat', { chatId: roomId });
    }
  }

  leaveRoom(roomType: 'world' | 'group' | 'private', roomId?: string) {
    if (!this.socket) return;

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
