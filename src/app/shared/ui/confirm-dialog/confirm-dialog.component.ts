import { CommonModule } from '@angular/common';
import { Component, HostListener, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly open = input(false);

  readonly titleKey = input.required<string>();
  readonly messageKey = input.required<string>();
  readonly confirmKey = input('COMMON.CONFIRM_ACTION');
  readonly cancelKey = input('COMMON.CANCEL');

  readonly loading = input(false);

  readonly danger = input(true);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && !this.loading()) {
      this.cancelled.emit();
    }
  }

  onBackdropClick(): void {
    if (this.loading()) {
      return;
    }
    this.cancelled.emit();
  }

  onPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onConfirm(): void {
    if (this.loading()) {
      return;
    }
    this.confirmed.emit();
  }

  onCancel(): void {
    if (this.loading()) {
      return;
    }
    this.cancelled.emit();
  }
}
