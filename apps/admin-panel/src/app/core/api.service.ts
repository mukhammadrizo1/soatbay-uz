import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export const DEFAULT_PAGE_SIZE = 25;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private params(query?: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') {
          params = params.set(k, String(v));
        }
      }
    }
    return params;
  }

  listQuery(page: number, extra?: Record<string, unknown>): Record<string, unknown> {
    return { page, pageSize: DEFAULT_PAGE_SIZE, ...extra };
  }

  get<T>(path: string, query?: Record<string, unknown>): Observable<T> {
    return this.http.get<T>(`${this.base}/${path}`, {
      params: this.params(query),
    });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, body ?? {});
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}/${path}`, body ?? {});
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}/${path}`);
  }

  /**
   * Telegram orqali proksilangan faylni (passport / to'lov cheki / skrinshot)
   * autentifikatsiyalangan klient orqali blob sifatida oladi va vaqtinchalik
   * object URL qaytaradi.
   */
  fileObjectUrl(which: 'employer' | 'worker', fileId: string): Observable<string> {
    return this.http
      .get(`${this.base}/files/${which}/${encodeURIComponent(fileId)}`, {
        responseType: 'blob',
      })
      .pipe(map((blob) => URL.createObjectURL(blob)));
  }

  /** Faylni blob sifatida olib, brauzerda yuklab olishni boshlaydi. */
  download(
    which: 'employer' | 'worker',
    fileId: string,
    filename = 'fayl',
  ): void {
    this.http
      .get(`${this.base}/files/${which}/${encodeURIComponent(fileId)}`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  /** Multipart yuborish (matn + ixtiyoriy fayl). Foydalanuvchiga xabar uchun. */
  upload<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, form);
  }
}
