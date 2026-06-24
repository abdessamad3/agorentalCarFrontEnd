import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-btn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-btn.component.html',
  styleUrls: ['./upload-btn.component.css']
})
export class UploadBtnComponent {
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() accept: string = 'image/*,.pdf';
  @Input() title: string = 'Upload document';
  /** When set, renders as a labeled pill (icon + text) instead of an icon-only square button. */
  @Input() label: string = '';
  /** Allow selecting more than one file per click. */
  @Input() multiple: boolean = false;
  /**
   * 'tile' renders a large dashed-border "+" drop-zone square (e.g. add-to-gallery grids).
   * 'block' renders a full-width dashed drop-zone bar with icon + label (e.g. a single
   * document upload field) — pass a dynamic `label` (e.g. the selected filename) for this one.
   * Both are ignored in favor of the pill style when `label` is set and variant is 'icon' (default).
   */
  @Input() variant: 'icon' | 'tile' | 'block' = 'icon';

  /** Fires once per selected file — convenient for single-file consumers (fires once even when multiple). */
  @Output() fileSelected = new EventEmitter<File>();
  /** Fires once with every selected file — convenient for multi-file consumers. */
  @Output() filesSelected = new EventEmitter<File[]>();

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length) return;
    this.filesSelected.emit(files);
    files.forEach(f => this.fileSelected.emit(f));
  }
}
