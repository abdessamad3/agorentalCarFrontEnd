import { Component, Input, OnChanges, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoitureService } from '../../services/voiture.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';
import { environment } from '../../../environments/environment';

const PLACEHOLDER = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2VkZjJmNyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjUwIiBmaWxsPSIjYTBhZWMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXNpemU9IjgwIj7wn5qlPC90ZXh0Pjwvc3ZnPg==`;

interface GalleryItem { id: number; path: string; }

@Component({
  selector: 'app-voiture-photos',
  standalone: true,
  imports: [CommonModule, BtnComponent, UploadBtnComponent],
  templateUrl: './voiture-photos.component.html',
  styleUrls: ['./voiture-photos.component.css'],
})
export class VoiturePhotosComponent implements OnChanges {
  @Input() car: any = null;
  @Output() photosChanged = new EventEmitter<void>();

  mainImage = '';
  gallery: GalleryItem[] = [];
  uploadQueue = 0;
  error = '';
  readonly placeholder = PLACEHOLDER;

  constructor(private voitureService: VoitureService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['car'] && this.car) {
      this.mainImage = this.imgUrlFor(this.car.image);
      this.gallery = Array.isArray(this.car.galleryImages)
        ? this.car.galleryImages.map((g: any) => ({ id: g.id, path: this.imgUrlFor(g.path) }))
        : [];
    }
  }

  get isUploading(): boolean { return this.uploadQueue > 0; }

  onFilesSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files || !this.car) return;
    Array.from(files).forEach(f => this.upload(f));
    (event.target as HTMLInputElement).value = '';
  }

  onFilesPicked(files: File[]): void {
    if (!this.car) return;
    files.forEach(f => this.upload(f));
  }

  private upload(file: File): void {
    this.uploadQueue++;
    this.error = '';
    this.voitureService.addVoitureImage(this.car.id, file).subscribe({
      next: (res) => {
        this.gallery.push({ id: res.id, path: this.imgUrlFor(res.image) });
        this.uploadQueue--;
        if (this.uploadQueue === 0) this.photosChanged.emit();
      },
      error: (err) => {
        this.error = err?.error?.error || 'Upload failed';
        this.uploadQueue--;
      },
    });
  }

  delete(item: GalleryItem): void {
    if (!this.car || !confirm('Delete this photo?')) return;
    this.voitureService.deleteVoitureImage(this.car.id, item.id).subscribe({
      next: () => {
        this.gallery = this.gallery.filter(g => g.id !== item.id);
        this.photosChanged.emit();
      },
      error: (err) => { this.error = err?.error?.error || 'Delete failed'; },
    });
  }

  imgUrlFor(img?: string): string {
    if (!img) return '';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    const base = environment.apiUrl.replace('/api', '');
    return base + (img.startsWith('/') ? img : '/' + img);
  }
}
