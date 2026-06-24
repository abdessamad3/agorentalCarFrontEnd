import {
  Component, Input, Output, EventEmitter,
  ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.css']
})
export class SignaturePadComponent implements AfterViewInit, OnChanges {
  @Input() label = '';
  @Input() existingSignature: string | null = null;
  @Output() signatureChange = new EventEmitter<string | null>();

  @ViewChild('sigCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private hasContent = false;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 1.8;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.existingSignature) this.drawExisting(this.existingSignature);

    canvas.addEventListener('mousedown',  this.onStart.bind(this));
    canvas.addEventListener('mousemove',  this.onMove.bind(this));
    canvas.addEventListener('mouseup',    this.onEnd.bind(this));
    canvas.addEventListener('mouseleave', this.onEnd.bind(this));
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove',  this.onTouchMove.bind(this),  { passive: false });
    canvas.addEventListener('touchend',   this.onEnd.bind(this));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['existingSignature'] && this.ctx) {
      this.clear(false);
      if (this.existingSignature) this.drawExisting(this.existingSignature);
    }
  }

  private drawExisting(src: string) {
    const img = new Image();
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
      this.hasContent = true;
    };
    img.src = src;
  }

  private getPos(e: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private getTouchPos(e: TouchEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  private onStart(e: MouseEvent) {
    this.isDrawing = true;
    const p = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
  }

  private onMove(e: MouseEvent) {
    if (!this.isDrawing) return;
    const p = this.getPos(e);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.hasContent = true;
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.isDrawing = true;
    const p = this.getTouchPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!this.isDrawing) return;
    const p = this.getTouchPos(e);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.hasContent = true;
  }

  private onEnd() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.signatureChange.emit(this.getSignature());
  }

  clear(emit = true) {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    this.hasContent = false;
    if (emit) this.signatureChange.emit(null);
  }

  getSignature(): string | null {
    if (!this.hasContent) return null;
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }
}
