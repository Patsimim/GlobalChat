// home.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  messages: Message[] = [
    {
      id: 1,
      text: 'Hello! How can I help you today?',
      isUser: false,
      timestamp: new Date(),
    },
  ];

  currentMessage: string = '';
  isLoading: boolean = false;

  sendMessage() {
    if (this.currentMessage.trim() === '') return;

    // Add user message
    const userMessage: Message = {
      id: this.messages.length + 1,
      text: this.currentMessage,
      isUser: true,
      timestamp: new Date(),
    };

    this.messages.push(userMessage);

    // Clear input
    const messageToSend = this.currentMessage;
    this.currentMessage = '';

    // Show loading
    this.isLoading = true;

    // Simulate bot response (replace with actual API call later)
    setTimeout(() => {
      const botMessage: Message = {
        id: this.messages.length + 1,
        text: `You said: "${messageToSend}". This is a demo response!`,
        isUser: false,
        timestamp: new Date(),
      };

      this.messages.push(botMessage);
      this.isLoading = false;

      // Scroll to bottom
      this.scrollToBottom();
    }, 1000);

    // Scroll to bottom for user message
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }
}
