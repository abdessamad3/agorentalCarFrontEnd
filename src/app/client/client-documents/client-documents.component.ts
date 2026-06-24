import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BtnComponent } from '../../shared/btn/btn.component';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';

type DocType = 'cin' | 'passeport' | 'permis' | 'autre';

interface ClientDoc {
  id: number;
  documentType: DocType;
  originalName: string;
  url: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-client-documents',
  standalone: true,
  imports: [CommonModule, BtnComponent, UploadBtnComponent],
  templateUrl: './client-documents.component.html',
  styleUrls: ['./client-documents.component.css'],
})
export class ClientDocumentsComponent implements OnChanges {
  @Input() clientId!: number;

  docs: ClientDoc[] = [];
  loading = false;
  uploading: DocType | null = null;
  uploadQueue: number = 0;
  error = '';

  readonly docTypes: { type: DocType; label: string }[] = [
    { type: 'cin',       label: 'CIN' },
    { type: 'passeport', label: 'Passport' },
    { type: 'permis',    label: 'Driving Licence' },
    { type: 'autre',     label: 'Other' },
  ];

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clientId'] && this.clientId) {
      this.load();
    }
  }

  load() {
    this.loading = true;
    this.http.get<ClientDoc[]>(`${environment.apiUrl}/client/${this.clientId}/documents`).subscribe({
      next: (docs) => { this.docs = docs; this.loading = false; },
      error: () => { this.error = 'Failed to load documents'; this.loading = false; },
    });
  }

  onFilesSelected(files: File[], type: DocType) {
    files.forEach(file => this.upload(file, type));
  }

  upload(file: File, type: DocType) {
    this.uploading = type;
    this.uploadQueue++;
    this.error = '';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', type);
    this.http.post<ClientDoc>(`${environment.apiUrl}/client/${this.clientId}/documents`, fd).subscribe({
      next: (doc) => {
        this.docs = [doc, ...this.docs];
        this.uploadQueue--;
        if (this.uploadQueue === 0) this.uploading = null;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Upload failed';
        this.uploadQueue--;
        if (this.uploadQueue === 0) this.uploading = null;
      },
    });
  }

  delete(doc: ClientDoc) {
    if (!confirm(`Delete "${doc.originalName}"?`)) return;
    this.http.delete(`${environment.apiUrl}/client/${this.clientId}/documents/${doc.id}`).subscribe({
      next: () => { this.docs = this.docs.filter(d => d.id !== doc.id); },
      error: () => { this.error = 'Delete failed'; },
    });
  }

  docsOf(type: DocType): ClientDoc[] {
    return this.docs.filter(d => d.documentType === type);
  }

  isImage(doc: ClientDoc): boolean {
    return /\.(jpg|jpeg|png|webp)$/i.test(doc.originalName);
  }

  fullUrl(doc: ClientDoc): string {
    return environment.apiUrl.replace('/api', '') + doc.url;
  }

  openFile(doc: ClientDoc) {
    window.open(this.fullUrl(doc), '_blank');
  }
}
