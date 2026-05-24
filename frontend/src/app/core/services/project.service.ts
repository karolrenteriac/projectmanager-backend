import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { Project, PaginatedResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(params?: { page?: number; limit?: number; status?: string }): Observable<{ projects: Project[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<{ projects: Project[]; total: number }>(this.apiUrl, { params: httpParams });
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<{ project: Project }>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.project));
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<{ project: Project }>(this.apiUrl, project)
      .pipe(map(res => res.project));
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<{ project: Project }>(`${this.apiUrl}/${id}`, project)
      .pipe(map(res => res.project));
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addMember(projectId: string, userId: string, role: string): Observable<Project> {
    return this.http.post<{ project: Project }>(`${this.apiUrl}/${projectId}/members`, { userId, role })
      .pipe(map(res => res.project));
  }

  removeMember(projectId: string, userId: string): Observable<Project> {
    return this.http.delete<{ project: Project }>(`${this.apiUrl}/${projectId}/members/${userId}`)
      .pipe(map(res => res.project));
  }

  getMyProjects(): Observable<Project[]> {
    return this.http.get<{ projects: Project[] }>(`${this.apiUrl}/my-projects`)
      .pipe(map(res => res.projects));
  }
}
