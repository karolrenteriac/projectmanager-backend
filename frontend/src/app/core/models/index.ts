export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'coordinator' | 'principal' | 'co-researcher';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed';
  startDate: string;
  endDate?: string;
  budget?: number;
  members: ProjectMember[];
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  user: string | User;
  role: 'admin' | 'coordinator' | 'principal' | 'co-researcher';
  joinedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  project: string | Project;
  assignedTo?: string | User;
  createdBy: string | User;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'meeting' | 'deadline' | 'reminder' | 'other';
  project?: string | Project;
  participants: string[] | User[];
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  content: string;
  sender: string | User;
  project: string | Project;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  _id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  project: string | Project;
  uploadedBy: string | User;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  type: 'task' | 'project' | 'chat' | 'calendar' | 'system';
  title: string;
  message: string;
  read: boolean;
  user: string | User;
  relatedId?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  upcomingEvents: number;
  unreadNotifications: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
