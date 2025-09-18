const fs = require(\'fs\');
const filePath = \'src/app/features/dashboard/user-dashboard.component.ts\';
let text = fs.readFileSync(filePath, \'utf8\').replace(/\r\n/g, '\n');

text = text.replace(
  "import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';",
  "import { ChangeDetectionStrategy, Component, ViewChild, computed, inject, signal } from '@angular/core';"
);

text = text.replace(
  `import { RouterLink } from '@angular/router';\nimport { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';\n`,
  `import { RouterLink } from '@angular/router';\nimport { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';\nimport { HttpClient, HttpHeaders } from '@angular/common/http';\n`
);

if (!text.includes("import { FileUpload, FileUploadModule } from 'primeng/fileupload';")) {
  text = text.replace(
    "import { toSignal } from '@angular/core/rxjs-interop';",
    `import { toSignal } from '@angular/core/rxjs-interop';\nimport { FileUpload, FileUploadModule } from 'primeng/fileupload';`
  );
}

text = text.replace(
  "import { catchError, map, of, switchMap, tap } from 'rxjs';",
  "import { catchError, firstValueFrom, map, of, switchMap, tap } from 'rxjs';"
);

text = text.replace(
  "imports: [CommonModule, ReactiveFormsModule, RouterLink],",
  "imports: [CommonModule, ReactiveFormsModule, RouterLink, FileUploadModule],"
);

const insertAfter = `interface RequestStatusCopy {\n  label: string;\n  tone: 'neutral' | 'progress' | 'success' | 'warning';\n}\n\n`;
if (text.includes(insertAfter)) {
  const addition = `interface UploadUrlResult {\n  url: string;\n  filePath: string;\n}\n\nconst MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;\n\n`;
  text = text.replace(insertAfter, insertAfter + addition);
}

const replacementBlock = `  private readonly fb = inject(FormBuilder);\n  private readonly authUser = inject(AuthUserService);\n  private readonly requestsService = inject(RequestsService);\n`;
if (text.includes(replacementBlock)) {
  const newBlock = `  private readonly fb = inject(FormBuilder);\n  private readonly authUser = inject(AuthUserService);\n  private readonly requestsService = inject(RequestsService);\n  private readonly http = inject(HttpClient);\n\n  @ViewChild('uploader') private uploader?: FileUpload;\n\n  private selectedFile: File | null = null;\n  protected readonly selectedFileName = signal<string | null>(null);\n  protected readonly attachmentError = signal<string | null>(null);\n  protected readonly maxAttachmentBytes = MAX_ATTACHMENT_BYTES;\n`;
  text = text.replace(replacementBlock, newBlock);
}

const insertMethodsMarker = `  protected statusCopy(status: RequestStatus): RequestStatusCopy {\n    switch (status) {\n      case 'in_progress':\n        return { label: 'In progress', tone: 'progress' };\n      case 'waiting_on_user':\n        return { label: 'Waiting on you', tone: 'warning' };\n      case 'resolved':\n        return { label: 'Resolved', tone: 'success' };\n      case 'closed':\n        return { label: 'Closed', tone: 'neutral' };\n      default:\n        return { label: 'New', tone: 'neutral' };\n    }\n  }\n\n`;
const newMethods = `  protected handleFileSelect(event: { files?: File[] }): void {\n    const file = event?.files?.[0];\n    if (!file) {\n      return;\n    }\n\n    const isZip = /\\.zip$/i.test(file.name);\n    const withinLimit = file.size <= MAX_ATTACHMENT_BYTES;\n\n    if (!isZip || !withinLimit) {\n      this.attachmentError.set(!isZip ? 'Only .zip files are allowed.' : 'Attachment must be 20MB or less.');\n      this.selectedFileName.set(null);\n      this.selectedFile = null;\n      this.uploader?.clear();\n      return;\n    }\n\n    this.attachmentError.set(null);\n    this.selectedFile = file;\n    this.selectedFileName.set(file.name);\n  }\n\n  protected clearAttachment(): void {\n    this.selectedFile = null;\n    this.selectedFileName.set(null);\n    this.attachmentError.set(null);\n    this.uploader?.clear();\n  }\n\n  private async uploadAttachment(file: File): Promise<string> {\n    const contentType = file.type || 'application/zip';\n    const uploadResult = await firstValueFrom(\n      this.http.post<UploadUrlResult>(\n        'https://us-central1-gitplumbers-35d92.cloudfunctions.net/getUploadUrl',\n        { fileName: file.name, contentType }\n      )\n    );\n\n    if (!uploadResult || !uploadResult.url || !uploadResult.filePath) {\n      throw new Error('Failed to retrieve upload URL.');\n    }\n\n    const headers = new HttpHeaders({ 'Content-Type': contentType });\n    await firstValueFrom(\n      this.http.put(uploadResult.url, file, { headers, responseType: 'text' })\n    );\n\n    return uploadResult.filePath;\n  }\n\n`;
if (text.includes(insertMethodsMarker) && !text.includes('handleFileSelect')) {
  text = text.replace(insertMethodsMarker, insertMethodsMarker + newMethods);
}

const oldSubmit = `  protected async submit(): Promise<void> {\n    this.feedback.set(null);\n\n    if (this.submitting()) {\n      return;\n    }\n\n    if (this.form.invalid) {\n      this.form.markAllAsTouched();\n      this.feedback.set('Please add a bit more detail so we can help.');\n      this.feedbackTone.set('error');\n      return;\n    }\n\n    const profile = this.profile();\n    if (!profile) {\n      this.feedback.set('You need to be signed in to send a request.');\n      this.feedbackTone.set('error');\n      return;\n    }\n\n    const payload: CreateSupportRequestPayload = {\n      message: this.form.controls.message.getRawValue().trim(),\n      githubRepo: this.form.controls.githubRepo.getRawValue().trim() || undefined,\n    };\n\n    this.submitting.set(true);\n    this.form.disable({ emitEvent: false });\n    try {\n      await this.requestsService.createRequest(profile, payload);\n      this.form.reset();\n      this.feedback.set("Request received. We'll get back ASAP.");\n      this.feedbackTone.set('success');\n    } catch (error) {\n      console.error('Failed to create request', error);\n      this.feedback.set('We could not send that request. Please try again.');\n      this.feedbackTone.set('error');\n    } finally {\n      this.form.enable({ emitEvent: false });\n      this.submitting.set(false);\n    }\n  }\n`;

const newSubmit = `  protected async submit(): Promise<void> {\n    this.feedback.set(null);\n\n    if (this.submitting()) {\n      return;\n    }\n\n    if (this.form invalid) {\n      this.form.markAllAsTouched();\n      this.feedback.set('Please add a bit more detail so we can help.');\n      this.feedbackTone.set('error');\n      return;\n    }\n\n    const profile = this.profile();\n    if (!profile) {\n      this.feedback.set('You need to be signed in to send a request.');\n      this.feedbackTone.set('error');\n      return;\n    }\n\n    this.submitting.set(true);\n    this.form.disable({ emitEvent: false });\n\n    let filePath: string | null = null;\n    if (this.selectedFile) {\n      try {\n        filePath = await this.uploadAttachment(this.selectedFile);\n      } catch (error) {\n        console.error('Failed to upload attachment', error);\n        this.feedback.set('We could not upload your attachment. Please try again.');\n        this.feedbackTone.set('error');\n        this.form.enable({ emitEvent: false });\n        this.submitting.set(false);\n        return;\n      }\n    }\n\n    const payload: CreateSupportRequestPayload = {\n      message: this.form.controls.message.getRawValue().trim(),\n      githubRepo: this.form.controls.githubRepo.getRawValue().trim() || undefined,\n      filePath: filePath ?? undefined,\n    };\n\n    let shouldClearAttachment = false;\n\n    try {\n      await this.requestsService.createRequest(profile, payload);\n      this.form.reset();\n      shouldClearAttachment = true;\n      this.feedback set("Request received. We'll get back ASAP.");\n      this.feedbackTone.set('success');\n    } catch (error) {\n      console.error('Failed to create request', error);\n      this.feedback.set('We could not send that request. Please try again.');\n      this.feedbackTone.set('error');\n    } finally {\n      this.form.enable({ emitEvent: false });\n      this.submitting.set(false);\n      if (shouldClearAttachment) {\n        this.clearAttachment();\n      }\n    }\n  }\n`;

if (text.includes(oldSubmit)) {
  text = text.replace(oldSubmit, newSubmit);
} else {
  throw new Error('submit method not found for replacement');
}

fs.writeFileSync(filePath, text.replace(/\n/g, '\r\n'), 'utf8');
