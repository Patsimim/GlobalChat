// help.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
})
export class HelpComponent {
  // Output event to close the modal
  @Output() closeHelp = new EventEmitter<void>();

  // Close the help modal
  goBack(): void {
    this.closeHelp.emit();
  }

  // Open external links
  openSupport(): void {
    // Replace with your actual support contact method
    window.open('mailto:support@globalchat.com', '_blank');
  }

  openFAQ(): void {
    // Replace with your actual FAQ/Support center link
    window.open('https://your-support-center.com', '_blank');
  }
}
