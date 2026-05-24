import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { Task } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(params?: { projectId?: string; status?: string; assignedTo?: string }): Observable<Task[]> {
    let httpParams = new HttpParams();
    if (params?.projectId) httpParams = httpParams.set('projectId', params.projectId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.assignedTo) httpParams = httpParams.set('assignedTo', params.assignedTo);

    return this.http.get<{ tasks: Task[] }>(this.apiUrl, { params: httpParams })
      .pipe(map(res => res.tasks));
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<{ task: Task }>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.task));
  }

  createTask(task: Partial<Task>): Observable<Task> {
    return this.http.post<{ task: Task }>(this.apiUrl, task)
      .pipe(map(res => res.task));
  }

  updateTask(id: string, task: Partial<Task>): Observable<Task> {
    return this.http.put<{ task: Task }>(`${this.apiUrl}/${id}`, task)
      .pipe(map(res => res.task));
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateTaskStatus(id: string, status: string): Observable<Task> {
    return this.http.patch<{ task: Task }>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(map(res => res.task));
  }

  assignTask(id: string, userId: string): Observable<Task> {
    return this.http.patch<{ task: Task }>(`${this.apiUrl}/${id}/assign`, { assignedTo: userId })
      .pipe(map(res => res.task));
  }

  getMyTasks(): Observable<Task[]> {
    return this.http.get<{ tasks: Task[] }>(`${this.apiUrl}/my-tasks`)
      .pipe(map(res => res.tasks));
  }

  getProjectTasks(projectId: string): Observable<Task[]> {
    return this.http.get<{ tasks: Task[] }>(`${this.apiUrl}/project/${projectId}`)
      .pipe(map(res => res.tasks));
  }
}
