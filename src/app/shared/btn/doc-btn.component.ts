import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-doc-btn',
  standalone: true,
  imports: [],
  templateUrl: './doc-btn.component.html',
  styleUrls: ['./doc-btn.component.css']
})
export class DocBtnComponent {
  @Input() href: string = '';
  @Input() title: string = 'Download document';
  @Input() forceDownload: boolean = false;
}
