import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { Document } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  getDocuments(projectId?: string): Observable<Document[]> {
    let httpParams = new HttpParams();
    if (projectId) httpParams = httpParams.set('projectId', projectId);

    return this.http.get<{ documents: Document[] }>(this.apiUrl, { params: httpParams })
      .pipe(map(res => res.documents));
  }

  getDocument(id: string): Observable<Document> {
    return this.http.get<{ document: Document }>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.document));
  }

  uploadDocument(file: File, projectId: string, description?: string): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    if (description) formData.append('description', description);

    return this.http.post<{ document: Document }>(this.apiUrl, formData)
      .pipe(map(res => res.document));
  }

  updateDocument(id: string, data: Partial<Document>): Observable<Document> {
    return this.http.put<{ document: Document }>(`${this.apiUrl}/${id}`, data)
      .pipe(map(res => res.document));
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  downloadDocument(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }

  getProjectDocuments(projectId: string): Observable<Document[]> {
    return this.http.get<{ documents: Document[] }>(`${this.apiUrl}/project/${projectId}`)
      .pipe(map(res => res.documents));
  }
}
