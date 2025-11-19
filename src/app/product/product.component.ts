
import { Component, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, lastValueFrom } from 'rxjs';
import { API } from '../shared/api-config';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { ProductService } from '../product-service.service';
import { Product } from '../shared/model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnDestroy {
  selectedFile: File | null = null;
  progress = 0;
  statusMessage = '';
  error?: string;
  subs: Subscription[] = [];
  private sse?: EventSource;
  private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  isUploading = false;
  products: Product[] = [];
  showProducts = false;
  private pollHandle?: any;
  private pollingJobId?: string | null = null;

  // Progress graph/state
  totalRecords = 0;
  currentRecords = 0;
  progressHistory: number[] = [];
  graphPoints = '';
  graphWidth = 240;
  graphHeight = 48;

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalProducts = 0;
  totalPages = 0;
  pages: number[] = [];

  currentCount = 0;
  totalCount = 0;
  percentage = 0;
  showProgressInfo = false;

  constructor(private http: HttpClient, private productSvc: ProductService, private router: Router, private ngZone: NgZone) { }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
    }
  }

  // template-compatible names
  onFileChosen(event: Event) { return this.onFileSelected(event); }

  async startUpload(overwrite = false) {
    return this.uploadFile(overwrite);
  }

  // pollJobStatus(jobId: string, intervalMs = 1000) {
  //   // Prevent multiple pollers for the same job
  //   if (this.pollingJobId === jobId && this.pollHandle) return;
  //   // Clear any previous poll
  //   if (this.pollHandle) {
  //     clearInterval(this.pollHandle);
  //     this.pollHandle = undefined;
  //     this.pollingJobId = null;
  //   }

  //   const url = `${API.uploadStatus}/${jobId}/`;
  //   this.statusMessage = 'Waiting for server...';
  //   this.pollingJobId = jobId;

  //   this.pollHandle = setInterval(async () => {
  //     try {
  //       const res: any = await lastValueFrom(this.http.get(url));
  //       const status = (res.status || '').toString().toLowerCase();

  //       // run the state updates inside Angular zone to ensure change-detection
  //       this.ngZone.run(() => {
  //         try {
  //           if (status === 'progress' || status === 'pending') {
  //             // Prefer structured meta if provided: { meta: { current, total } }
  //             const meta = res.meta ?? res.data ?? null;
  //             if (meta && typeof meta.current === 'number' && typeof meta.total === 'number') {
  //               this.currentRecords = meta.current;
  //               this.totalRecords = meta.total;
  //               const pct = Math.min(100, Math.round(100 * (meta.current / Math.max(1, meta.total))));
  //               this.progress = pct;
  //               // push history
  //               this.progressHistory.push(pct);
  //               if (this.progressHistory.length > 60) this.progressHistory.shift();
  //               this.computeGraphPoints();
  //               this.statusMessage = res.message ?? res.status ?? this.statusMessage;
  //             } else if (typeof res.current === 'number' && typeof res.total === 'number') {
  //               // Some backends return current/total at the top level
  //               this.currentRecords = res.current;
  //               this.totalRecords = res.total;
  //               const pct = Math.min(100, Math.round(100 * (res.current / Math.max(1, res.total))));
  //               this.progress = pct;
  //               this.progressHistory.push(pct);
  //               if (this.progressHistory.length > 60) this.progressHistory.shift();
  //               this.computeGraphPoints();
  //               this.statusMessage = res.message ?? res.status ?? this.statusMessage;
  //             } else {
  //               // fallback to other possible shapes
  //               this.progress = res.progress ?? res.current ?? this.progress;
  //               this.statusMessage = res.message ?? res.status ?? this.statusMessage;
  //             }
  //           } else if (status === 'success' || status === 'completed' || status === 'ok') {
  //             this.progress = res.progress ?? 100;
  //             this.statusMessage = res.message ?? 'Import complete';
  //             // finalize graph with 100%
  //             this.currentRecords = res.meta?.current ?? res.current ?? this.currentRecords;
  //             this.totalRecords = res.meta?.total ?? res.total ?? this.totalRecords;
  //             this.progressHistory.push(100);
  //             if (this.progressHistory.length > 60) this.progressHistory.shift();
  //             this.computeGraphPoints();
  //             if (this.pollHandle) { clearInterval(this.pollHandle); }
  //             this.pollHandle = undefined;
  //             this.pollingJobId = null;
  //           } else {
  //             // treat other states (failure/error/unknown) as terminal
  //             this.error = res.info?.error || res.error || res.message || (`Task status: ${res.status}`);
  //             if (this.pollHandle) { clearInterval(this.pollHandle); }
  //             this.pollHandle = undefined;
  //             this.pollingJobId = null;
  //           }
  //         } catch (innerErr) {
  //           console.error('Error updating poll state', innerErr);
  //         }
  //       });
  //     } catch (err) {
  //       console.warn('Poll error', err);
  //       // On repeated network errors you may want to stop polling after retries.
  //     }
  //   }, intervalMs);
  // }
  pollJobStatus(jobId: string, intervalMs = 1000) {
    if (this.pollingJobId === jobId && this.pollHandle) return;

    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = undefined;
      this.pollingJobId = null;
    }

    const url = `${API.uploadStatus}/${jobId}/`;
    this.statusMessage = 'Waiting for server...';
    this.pollingJobId = jobId;
    // ensure UI shows progress area once polling starts
    this.showProgressInfo = true;

    this.pollHandle = setInterval(async () => {
      try {
        const res: any = await lastValueFrom(this.http.get(url));
        const status = (res.status || '').toString().toLowerCase();

        this.ngZone.run(() => {
          try {
            if (status === 'progress' || status === 'pending') {
              const meta = res.meta ?? res.data ?? null;

              // debug log every poll
              console.log('[poll] status=', status, 'meta=', meta, 'res=', res);

              if (meta) {
                this.currentCount = Number(meta.current ?? 0);
                this.totalCount = Number(meta.total ?? 0);
              } else {
                // fallback in case API returns flat structure
                this.currentCount = Number(res.current ?? 0);
                this.totalCount = Number(res.total ?? 0);
              }

              // once we've seen counts, keep the progress info visible
              if (this.currentCount > 0 || this.totalCount > 0) {
                this.showProgressInfo = true;
              }

              // compute percentage (guard divide-by-zero)
              if (this.totalCount > 0) {
                this.percentage = Math.round((this.currentCount / this.totalCount) * 100);
              }

              // update progress and graph history so UI updates each poll
              this.progress = this.percentage;
              this.progressHistory.push(this.percentage);
              if (this.progressHistory.length > 120) this.progressHistory.shift();
              this.computeGraphPoints();
              this.statusMessage = res.message ?? res.status ?? 'Processing...';

            } else if (status === 'success' || status === 'completed' || status === 'ok') {

              const meta = res.meta ?? res.data ?? null;

              if (meta) {
                this.currentCount = Number(meta.current ?? meta.total ?? 0);
                this.totalCount = Number(meta.total ?? meta.current ?? 0);
              } else {
                this.currentCount = Number(res.current ?? res.total ?? this.currentCount ?? 0);
                this.totalCount = Number(res.total ?? res.current ?? this.totalCount ?? 0);
              }

              this.showProgressInfo = true;

              this.percentage = 100;
              this.progress = 100;
              this.progressHistory.push(100);
              if (this.progressHistory.length > 120) this.progressHistory.shift();
              this.computeGraphPoints();
              this.statusMessage = res.message ?? 'Import complete';

              if (this.pollHandle) {
                clearInterval(this.pollHandle);
                this.pollHandle = undefined;
              }
              this.pollingJobId = null;

            } else {
              // ERROR state
              this.error = res.error || res.message || (`Task status: ${res.status}`);
              if (this.pollHandle) {
                clearInterval(this.pollHandle);
              }
              this.pollHandle = undefined;
              this.pollingJobId = null;
            }

          } catch (innerErr) {
            console.error('Error updating poll state', innerErr);
          }
        });

      } catch (err) {
        console.warn('Polling failed:', err);
      }

    }, intervalMs);
  }


  private computeGraphPoints() {
    const pts: string[] = [];
    const arr = this.progressHistory.slice();
    const n = arr.length || 1;
    const w = this.graphWidth;
    const h = this.graphHeight;
    const step = n > 1 ? w / (n - 1) : w;
    for (let i = 0; i < n; i++) {
      const x = Math.round(i * step);
      const v = arr[i] ?? 0;
      const y = Math.round(h - (Math.max(0, Math.min(100, v)) / 100) * h);
      pts.push(`${x},${y}`);
    }
    this.graphPoints = pts.join(' ');
  }

  clear() {
    this.selectedFile = null;
    this.progress = 0;
    this.statusMessage = 'Idle';
    this.error = undefined;
    this.isUploading = false;
  }

  async uploadFile(overwrite = false) {
    const file = this.selectedFile;
    if (!file) {
      this.statusMessage = 'No file selected';
      return;
    }
    try {
      this.isUploading = true;
      // Always send the file as a single multipart/form-data POST to match what works in Postman.
      this.statusMessage = 'Uploading file';
      const form = new FormData();
      form.append('file', file);
      form.append('overwrite', String(overwrite));

      const req$ = this.http.post(API.upload, form, { reportProgress: true, observe: 'events' });

      const sub = req$.subscribe((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && (event as any).total) {
          this.progress = Math.round(100 * ((event as any).loaded / (event as any).total));
          this.statusMessage = `Uploading (${this.progress}%)`;
        } else if (event.type === HttpEventType.Response) {
          this.statusMessage = 'Server processing';
          const body: any = (event as any).body;
          const jobId = body?.job_id || body?.jobId || body?.id;
          // Reset graph history and seed with current upload percent so the sparkline appears immediately
          this.progressHistory = [];
          this.progressHistory.push(this.progress ?? 0);
          this.computeGraphPoints();
          if (jobId) {
            this.pollJobStatus(jobId);
          }
        }
      }, (err) => {
        this.error = err?.message || 'Upload failed';
      });

      this.subs.push(sub);
      await lastValueFrom(req$);
    } catch (err: any) {
      this.error = err?.message || String(err);
    } finally {
      this.isUploading = false;
    }
  }

  // Updated fetchProducts with pagination
  async fetchProducts(page: number = 1) {
    try {
      const resp: any = await lastValueFrom(this.productSvc.list(page, this.pageSize, {}));
      this.products = resp.rows || [];
      this.totalProducts = resp.total || 0;
      this.currentPage = page;
      this.totalPages = Math.ceil(this.totalProducts / this.pageSize);
      this.generatePageNumbers();
      this.showProducts = true;
    } catch (err: any) {
      this.error = err?.message || String(err);
    }
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.fetchProducts(page);
    }
  }
  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize = parseInt(select.value);
    this.currentPage = 1; // Reset to first page when changing page size
    if (this.showProducts) {
      this.fetchProducts(1);
    }
  }
  getDisplayRange(): { start: number, end: number } {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalProducts);
    return { start, end };
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.fetchProducts(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.fetchProducts(this.currentPage - 1);
    }
  }

  generatePageNumbers() {
    const maxVisiblePages = 5;
    this.pages = [];

    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  goToList() {
    // Navigate to the product listing route defined in `app.routes.ts`
    this.router.navigate(['/products', 'list']);
  }

  private async uploadInChunks(file: File, overwrite: boolean) {
    this.statusMessage = 'Chunking file and uploading';
    const total = file.size;
    const chunks = Math.ceil(total / this.CHUNK_SIZE);

    const uploadIdResp: any = await lastValueFrom(this.http.post(API.upload, { filename: file.name, chunks }));
    const uploadId = uploadIdResp?.uploadId || `upload_${Date.now()}`;

    let uploadedBytes = 0;

    for (let i = 0; i < chunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, total);
      const blob = file.slice(start, end);
      const form = new FormData();
      form.append('chunk', blob);
      form.append('uploadId', uploadId);
      form.append('index', String(i));
      form.append('overwrite', String(overwrite));
      form.append('filename', file.name);

      await lastValueFrom(this.http.post(API.uploadChunk, form));
      uploadedBytes += (end - start);
      this.progress = Math.round(100 * (uploadedBytes / total));
      this.statusMessage = `Uploading chunks (${this.progress}%)`;
    }
  }

  private setupSseListener() {
    // This method is no longer used as SSE is not implemented.
  }

  private closeSse() {
    // This method is no longer used as SSE is not implemented.
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    // clear any active poll
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = undefined;
      this.pollingJobId = null;
    }
  }
}