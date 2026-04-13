import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';
import { Notification } from '../models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    return this.http.get<{ notifications: Notification[] }>(this.apiUrl)
      .pipe(
        map(res => {
          const unreadCount = res.notifications.filter(n => !n.read).length;
          this.unreadCountSubject.next(unreadCount);
          return res.notifications;
        })
      );
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.patch<{ notification: Notification }>(`${this.apiUrl}/${id}/read`, {})
      .pipe(
        map(res => {
          this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
          return res.notification;
        })
      );
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/read-all`, {})
      .pipe(
        map(() => {
          this.unreadCountSubject.next(0);
        })
      );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`)
      .pipe(
        map(res => {
          this.unreadCountSubject.next(res.count);
          return res.count;
        })
      );
  }
}
