// create-group-chat.component.ts - Simple modal version
import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ApiChatRoom } from '../services/chat.service';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './create-group-chat.html',
  styleUrls: ['./create-group-chat.scss'],
})
export class CreateGroupModalComponent implements OnInit, OnDestroy {
  @Output() groupCreated = new EventEmitter<ApiChatRoom>();
  @Output() modalClosed = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Form data
  groupName: string = '';
  groupDescription: string = '';

  // Validation errors
  groupNameError: string = '';

  // Loading states
  isCreating: boolean = false;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    // Focus on group name input after modal opens
    setTimeout(() => {
      const nameInput = document.getElementById(
        'groupName'
      ) as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Validation
  private validateForm(): boolean {
    this.clearValidationErrors();
    let isValid = true;

    // Validate group name
    if (!this.groupName.trim()) {
      this.groupNameError = 'Group name is required';
      isValid = false;
    } else if (this.groupName.trim().length < 2) {
      this.groupNameError = 'Group name must be at least 2 characters';
      isValid = false;
    }

    return isValid;
  }

  private clearValidationErrors() {
    this.groupNameError = '';
  }

  canCreateGroup(): boolean {
    return this.groupName.trim().length >= 2 && !this.isCreating;
  }

  // Group creation
  createGroup() {
    if (!this.validateForm()) {
      return;
    }

    this.isCreating = true;

    // Use the simple group creation method without participants
    this.chatService
      .createGroupSimple(
        this.groupName.trim(),
        [], // No participants for now
        this.groupDescription.trim() || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.group) {
            this.groupCreated.emit(response.group);
            this.closeModal();
          } else {
            alert(response.message || 'Failed to create group');
          }
          this.isCreating = false;
        },
        error: (error) => {
          console.error('Error creating group:', error);
          alert('Failed to create group. Please try again.');
          this.isCreating = false;
        },
      });
  }

  // Modal actions
  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal() {
    if (this.isCreating) {
      return; // Prevent closing while creating
    }
    this.modalClosed.emit();
  }
}
