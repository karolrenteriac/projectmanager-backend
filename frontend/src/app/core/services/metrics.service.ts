import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { DashboardMetrics } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  private readonly apiUrl = `${environment.apiUrl}/metrics`;

  constructor(private http: HttpClient) {}

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<{ metrics: DashboardMetrics }>(this.apiUrl)
      .pipe(map(res => res.metrics));
  }

  getProjectMetrics(projectId: string): Observable<any> {
    return this.http.get<{ metrics: any }>(`${this.apiUrl}/project/${projectId}`)
      .pipe(map(res => res.metrics));
  }

  getTaskMetrics(): Observable<any> {
    return this.http.get<{ metrics: any }>(`${this.apiUrl}/tasks`)
      .pipe(map(res => res.metrics));
  }

  getUserMetrics(userId?: string): Observable<any> {
    const url = userId ? `${this.apiUrl}/user/${userId}` : `${this.apiUrl}/user`;
    return this.http.get<{ metrics: any }>(url)
      .pipe(map(res => res.metrics));
  }
}
