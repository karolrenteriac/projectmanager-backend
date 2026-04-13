import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';
import { ChatMessage } from '../models';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/chat`;
  private socket: Socket | null = null;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  connect(projectId: string): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(environment.socketUrl, {
      auth: {
        token: this.authService.getToken()
      }
    });

    this.socket.emit('joinRoom', projectId);

    this.socket.on('message', (message: ChatMessage) => {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
    });

    this.socket.on('previousMessages', (messages: ChatMessage[]) => {
      this.messagesSubject.next(messages);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.messagesSubject.next([]);
    }
  }

  sendMessage(content: string, projectId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('sendMessage', { content, projectId });
    }
  }

  getMessages(projectId: string): Observable<ChatMessage[]> {
    return this.http.get<{ messages: ChatMessage[] }>(`${this.apiUrl}/${projectId}`)
      .pipe(map(res => res.messages));
  }

  getProjectChats(projectId: string): Observable<ChatMessage[]> {
    return this.http.get<{ messages: ChatMessage[] }>(`${this.apiUrl}/project/${projectId}`)
      .pipe(map(res => res.messages));
  }
}
