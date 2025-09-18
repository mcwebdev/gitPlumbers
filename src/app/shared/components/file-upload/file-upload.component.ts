import {
  Component,
  ViewChild,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';

export interface FileUploadEvent {
  files?: File[];
}

export interface FileUploadConfig {
  accept: string;
  maxFileSize: number;
  label: string;
  hint?: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FileUploadModule],
  template: `
    <div class="file-upload-wrapper">
      <label class="field-label">{{ config().label }}</label>

      <p-fileUpload
        #uploader
        mode="basic"
        [accept]="config().accept"
        [maxFileSize]="config().maxFileSize"
        [auto]="false"
        chooseLabel="Choose File"
        [showUploadButton]="false"
        [showCancelButton]="false"
        (onSelect)="onFileSelect($event)"
        (onClear)="onClear()"
        class="custom-file-upload"
      />

      @if (selectedFileName()) {
      <div class="selected-file">
        <div class="file-info">
          <i class="pi pi-file"></i>
          <span class="file-name">{{ selectedFileName() }}</span>
          <button type="button" class="remove-file-btn" (click)="clearFile()" title="Remove file">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
      } @if (error()) {
      <div class="upload-error">
        <i class="pi pi-exclamation-triangle"></i>
        {{ error() }}
      </div>
      } @if (config().hint && !error()) {
      <div class="upload-hint">{{ config().hint }}</div>
      }
    </div>
  `,
  styleUrls: ['./file-upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  @ViewChild('uploader') private uploader?: FileUpload;

  // Inputs
  readonly config = input.required<FileUploadConfig>();

  // Outputs
  readonly fileSelected = output<File | null>();

  // State
  readonly selectedFileName = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  private selectedFile: File | null = null;

  onFileSelect(event: FileUploadEvent): void {
    const file = event?.files?.[0];
    if (!file) return;

    const config = this.config();
    const isValidType =
      file.type.match(config.accept.replace('*', '.*')) ||
      config.accept.includes(file.name.split('.').pop()?.toLowerCase() || '');
    const isValidSize = file.size <= config.maxFileSize;

    if (!isValidType) {
      this.error.set(`Invalid file type. Expected: ${config.accept}`);
      this.clearFile();
      return;
    }

    if (!isValidSize) {
      const maxSizeMB = Math.round(config.maxFileSize / (1024 * 1024));
      this.error.set(`File too large. Maximum size: ${maxSizeMB}MB`);
      this.clearFile();
      return;
    }

    this.selectedFile = file;
    this.selectedFileName.set(file.name);
    this.error.set(null);
    this.fileSelected.emit(file);
  }

  onClear(): void {
    this.clearFile();
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.error.set(null);
    this.uploader?.clear();
    this.fileSelected.emit(null);
  }

  getSelectedFile(): File | null {
    return this.selectedFile;
  }
}
