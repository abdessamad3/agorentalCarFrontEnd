import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-test-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="max-width:500px;margin:60px auto;font-family:sans-serif;padding:24px;border:1px solid #ddd;border-radius:8px">
      <h2>Image Upload Test</h2>

      <input type="file" accept="image/*" (change)="onFile($event)" style="margin-bottom:12px;display:block" />

      <div *ngIf="preview" style="margin-bottom:12px">
        <img [src]="preview" style="max-width:100%;max-height:200px;border-radius:4px" />
        <p style="font-size:12px;color:#666">{{ fileName }} — {{ fileSize }}</p>
      </div>

      <button (click)="upload()" [disabled]="!file || loading"
        style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">
        {{ loading ? 'Uploading…' : 'Upload' }}
      </button>

      <div *ngIf="result" style="margin-top:20px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px">
        <strong style="color:#16a34a">Success</strong>
        <p style="margin:4px 0;font-size:13px">Image path: <code>{{ result.image }}</code></p>
        <img *ngIf="result.image" [src]="result.image" style="max-width:100%;margin-top:8px;border-radius:4px" />
      </div>

      <div *ngIf="error" style="margin-top:20px;padding:12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px">
        <strong style="color:#dc2626">Error</strong>
        <pre style="font-size:12px;margin:4px 0;white-space:pre-wrap">{{ error }}</pre>
      </div>
    </div>
  `
})
export class TestUploadComponent {
  file: File | null = null;
  preview: string | null = null;
  fileName = '';
  fileSize = '';
  loading = false;
  result: any = null;
  error = '';

  constructor(private http: HttpClient) {}

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    this.file = f;
    this.fileName = f.name;
    this.fileSize = (f.size / 1024).toFixed(1) + ' KB';
    this.result = null;
    this.error = '';
    const reader = new FileReader();
    reader.onload = (e) => this.preview = e.target?.result as string;
    reader.readAsDataURL(f);
  }

  upload(): void {
    if (!this.file) return;
    this.loading = true;
    this.result = null;
    this.error = '';

    const fd = new FormData();
    fd.append('imageFile', this.file);
    fd.append('marque', 'TEST');
    fd.append('modele', 'TEST');
    fd.append('annee', '2024');
    fd.append('typeCarburant', 'Essence');
    fd.append('kilometrageActuel', '0');
    fd.append('prixJour', '1');
    fd.append('voitureStatus', 'disponible');

    this.http.post<any>('/api/voiture', fd).subscribe({
      next: (res) => { this.result = res; this.loading = false; },
      error: (err) => {
        this.error = JSON.stringify(err.error ?? err.message, null, 2);
        this.loading = false;
      }
    });
  }
}
