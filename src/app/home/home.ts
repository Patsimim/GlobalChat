interface User {
  id: string;
  username: string;
  country: string;
  isOnline: boolean;
} // home.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
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

  onlineUsers: User[] = [
    { id: 'user1', username: 'SakuraUser', country: '🇯🇵', isOnline: true },
    { id: 'user2', username: 'NYCExplorer', country: '🇺🇸', isOnline: true },
    { id: 'user3', username: 'LondonVibes', country: '🇬🇧', isOnline: true },
    { id: 'user4', username: 'ParisLife', country: '🇫🇷', isOnline: true },
    { id: 'user5', username: 'BerlinTech', country: '🇩🇪', isOnline: true },
  ];

  currentMessage: string = '';
  showMenu: boolean = false;
  currentUser = {
    id: 'current-user',
    username: 'You', // This would come from login/auth service
    country: '🇵🇭', // Philippines flag since you're in Cebu
  };

  readonly apiURL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // In a real app, you'd load messages from the server
    // this.loadGlobalMessages();
    // this.connectToWebSocket(); // For real-time updates
  }

  sendMessage() {
    if (this.currentMessage.trim() === '') return;

    // Add user message
    const userMessage: Message = {
      id: this.messages.length + 1,
      text: this.currentMessage,
      username: this.currentUser.username,
      userId: this.currentUser.id,
      timestamp: new Date(),
      country: this.currentUser.country,
      isOwnMessage: true,
    };

    this.messages.push(userMessage);

    // Clear input
    this.currentMessage = '';

    // In a real app, send to server via HTTP/WebSocket
    // this.http.post(`${this.apiURL}/messages`, userMessage).subscribe();

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
    this.showMenu = !this.showMenu;
    console.log('Profile menu toggled:', this.showMenu);
    // You can add profile/user menu logic here
    // For example: open user settings, logout, profile options, etc.
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  // Mock functions for real implementation
  loadGlobalMessages() {
    // this.http.get(`${this.apiURL}/global-messages`).subscribe(messages => {
    //   this.messages = messages;
    // });
  }

  // connectToWebSocket() {
  //   // Connect to WebSocket for real-time messages
  // }
}
