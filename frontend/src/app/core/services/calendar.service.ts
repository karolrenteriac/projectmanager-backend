import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { CalendarEvent } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly apiUrl = `${environment.apiUrl}/calendar`;

  constructor(private http: HttpClient) {}

  getEvents(params?: { startDate?: string; endDate?: string; projectId?: string }): Observable<CalendarEvent[]> {
    let httpParams = new HttpParams();
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.projectId) httpParams = httpParams.set('projectId', params.projectId);

    return this.http.get<{ events: CalendarEvent[] }>(this.apiUrl, { params: httpParams })
      .pipe(map(res => res.events));
  }

  getEvent(id: string): Observable<CalendarEvent> {
    return this.http.get<{ event: CalendarEvent }>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.event));
  }

  createEvent(event: Partial<CalendarEvent>): Observable<CalendarEvent> {
    return this.http.post<{ event: CalendarEvent }>(this.apiUrl, event)
      .pipe(map(res => res.event));
  }

  updateEvent(id: string, event: Partial<CalendarEvent>): Observable<CalendarEvent> {
    return this.http.put<{ event: CalendarEvent }>(`${this.apiUrl}/${id}`, event)
      .pipe(map(res => res.event));
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getUpcomingEvents(limit: number = 5): Observable<CalendarEvent[]> {
    return this.http.get<{ events: CalendarEvent[] }>(`${this.apiUrl}/upcoming?limit=${limit}`)
      .pipe(map(res => res.events));
  }
}
