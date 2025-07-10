// context-menu.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

export interface ContextMenuUser {
  id: string;
  username: string;
  country?: string;
  isOnline?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './right-click-menu.html',
  styleUrls: ['./right-click-menu.scss'],
})
export class ContextMenuComponent implements OnInit, OnDestroy, OnChanges {
  @Input() user: ContextMenuUser | null = null;
  @Input() position: { x: number; y: number } = { x: 0, y: 0 };
  @Input() isVisible: boolean = false;
  @Input() currentUserId: string = '';

  @Output() actionSelected = new EventEmitter<{
    action: string;
    user: ContextMenuUser;
  }>();
  @Output() menuClosed = new EventEmitter<void>();

  @ViewChild('contextMenu', { static: false }) contextMenuRef!: ElementRef;

  actions: ContextMenuAction[] = [];

  ngOnInit() {
    // Add global click listener to close menu
    document.addEventListener('click', this.handleGlobalClick);
    document.addEventListener('contextmenu', this.handleGlobalClick);
    document.addEventListener('scroll', this.handleScroll);
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy() {
    // Remove global listeners
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('contextmenu', this.handleGlobalClick);
    document.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
  }

  ngOnChanges() {
    if (this.user) {
      this.updateActions();
    }
  }

  private updateActions() {
    if (!this.user) return;

    const isOwnProfile = this.user.id === this.currentUserId;

    this.actions = [
      {
        id: 'profile',
        label: 'View Profile',
        icon: 'person',
        action: () => this.emitAction('profile'),
        disabled: false,
      },
      {
        id: 'message',
        label: 'Send Message',
        icon: 'message',
        action: () => this.emitAction('message'),
        disabled: isOwnProfile,
        divider: true,
      },
      {
        id: 'add_friend',
        label: this.user.isFriend ? 'Remove Friend' : 'Add Friend',
        icon: this.user.isFriend ? 'person_remove' : 'person_add',
        action: () =>
          this.emitAction(this.user!.isFriend ? 'remove_friend' : 'add_friend'),
        disabled: isOwnProfile,
      },
      {
        id: 'block',
        label: this.user.isBlocked ? 'Unblock User' : 'Block User',
        icon: this.user.isBlocked ? 'block' : 'block',
        action: () =>
          this.emitAction(this.user!.isBlocked ? 'unblock' : 'block'),
        disabled: isOwnProfile,
      },
    ];
  }

  // Make this method public so it can be called from the template
  public handleAction(action: ContextMenuAction) {
    if (action.disabled) return;
    action.action();
    this.closeMenu();
  }

  private emitAction(actionId: string) {
    if (this.user) {
      this.actionSelected.emit({ action: actionId, user: this.user });
    }
  }

  private handleGlobalClick = (event: Event) => {
    if (
      this.isVisible &&
      this.contextMenuRef &&
      !this.contextMenuRef.nativeElement.contains(event.target)
    ) {
      this.closeMenu();
    }
  };

  private handleScroll = () => {
    if (this.isVisible) {
      this.closeMenu();
    }
  };

  private handleResize = () => {
    if (this.isVisible) {
      this.closeMenu();
    }
  };

  private closeMenu() {
    this.menuClosed.emit();
  }

  // Additional method to handle keyboard navigation
  onKeyDown(event: KeyboardEvent, action: ContextMenuAction) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleAction(action);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
    }
  }

  // Method to adjust position if menu goes off-screen
  ngAfterViewInit() {
    if (this.isVisible && this.contextMenuRef) {
      this.adjustPosition();
    }
  }

  private adjustPosition() {
    if (!this.contextMenuRef) return;

    const menuElement = this.contextMenuRef.nativeElement;
    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = this.position.x;
    let adjustedY = this.position.y;

    // Adjust horizontal position if menu goes off-screen
    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }
    if (adjustedX < 10) {
      adjustedX = 10;
    }

    // Adjust vertical position if menu goes off-screen
    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }
    if (adjustedY < 10) {
      adjustedY = 10;
    }

    // Apply adjusted position
    if (adjustedX !== this.position.x || adjustedY !== this.position.y) {
      menuElement.style.left = adjustedX + 'px';
      menuElement.style.top = adjustedY + 'px';
    }
  }
}
