import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-upload-card-pw',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="document-card"
      [class.selected]="currentFileStatus === 'selected'"
      [class.uploaded]="currentFileStatus === 'uploaded'"
      [class.error]="currentFileStatus === 'error'"
      [class.uploading]="currentFileStatus === 'uploading'"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <h3>{{ documentName }} <span *ngIf="isRequired" class="required-tag">(Requerido)</span></h3>
      
      <div class="upload-area">
        <label *ngIf="currentFileStatus !== 'uploaded' && currentFileStatus !== 'uploading'" class="custom-file-upload">
          <input type="file" (change)="onFileSelected($event)" accept="application/pdf">
          <i class="fas fa-cloud-upload-alt"></i> Subir PDF
        </label>

        <p class="file-name" *ngIf="currentFileName">
          <i class="fas fa-file-pdf"></i> {{ currentFileName }}
          <span *ngIf="currentFileStatus === 'uploaded'" class="status-icon uploaded-icon"><i class="fas fa-check-circle"></i></span>
          <span *ngIf="currentFileStatus === 'selected'" class="status-icon selected-icon"><i class="fas fa-hourglass-half"></i></span>
          <span *ngIf="currentFileStatus === 'error'" class="status-icon error-icon"><i class="fas fa-exclamation-triangle"></i></span>
          <span *ngIf="currentFileStatus === 'uploading'" class="status-icon uploading-icon"><i class="fas fa-spinner fa-spin"></i></span>
        </p>

        <div *ngIf="currentFileStatus === 'uploading' && uploadProgress !== undefined" class="progress-bar-container">
          <div class="progress-bar" [style.width.%]="uploadProgress"></div>
          <span class="progress-text">{{ uploadProgress }}%</span>
        </div>

        <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>
      </div>

      <div class="card-actions">
        <button 
          *ngIf="currentFileName" 
          (click)="previewRequested.emit({ documentName: documentName, file: null })" 
          class="preview-button"
        >
          <i class="fas fa-eye"></i> Previsualizar
        </button>
        <button 
          *ngIf="currentFileName" 
          (click)="onRemoveFile()" 
          class="remove-button"
          [disabled]="currentFileStatus === 'uploading'"
        >
          <i class="fas fa-trash-alt"></i> Quitar
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./document-upload-card-pw.component.css']
})
export class DocumentUploadCardPwComponent implements OnInit {
  @Input() documentName: string = '';
  @Input() isRequired: boolean = false;
  // CORRECCIÓN AQUÍ: permitimos que los inputs sean 'undefined'
  @Input() currentFileStatus: 'pending' | 'selected' | 'uploaded' | 'error' | 'uploading' | undefined = 'pending';
  @Input() currentFileName: string | null | undefined = null; // También puede ser undefined
  @Input() uploadProgress: number | undefined;
  @Input() errorMessage: string | undefined;

  @Output() fileSelected = new EventEmitter<{ documentName: string, file: File | null }>();
  @Output() previewRequested = new EventEmitter<{ documentName: string, file: File | null }>();
  @Output() fileRemoved = new EventEmitter<{ documentName: string }>();

  constructor() { }

  ngOnInit(): void { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'application/pdf') {
        this.fileSelected.emit({ documentName: this.documentName, file: file });
      } else {
        //alert('Solo se permiten archivos PDF.');
        this.fileSelected.emit({ documentName: this.documentName, file: null });
      }
    } else {
      this.fileSelected.emit({ documentName: this.documentName, file: null });
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.closest('.document-card')?.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.closest('.document-card')?.classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.closest('.document-card')?.classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.fileSelected.emit({ documentName: this.documentName, file: file });
      } else {
        //alert('Solo se permiten archivos PDF.');
        this.fileSelected.emit({ documentName: this.documentName, file: null });
      }
    }
  }

  onRemoveFile(): void {
    this.fileRemoved.emit({ documentName: this.documentName });
  }
}
