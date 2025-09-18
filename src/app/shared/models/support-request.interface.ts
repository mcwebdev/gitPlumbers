export interface SupportRequestNote {
  id: string;
  authorId: string;
  authorName: string;
  role: 'user' | 'admin';
  message: string;
  createdAt: Date;
}

export interface SupportRequest {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  filePath: string | null;
  githubRepo: string;
  message: string;
  notes: SupportRequestNote[];
  status: SupportRequestStatus;
  userEmail: string;
  userId: string;
  userName: string;
}

export type SupportRequestStatus = 'new' | 'in-progress' | 'completed' | 'cancelled';

export interface CreateSupportRequestRequest {
  filePath?: string | null;
  githubRepo: string;
  message: string;
  notes?: SupportRequestNote[];
}

export interface UpdateSupportRequestRequest {
  status?: SupportRequestStatus;
  notes?: SupportRequestNote[];
  message?: string;
}

export interface SupportRequestFilters {
  status?: SupportRequestStatus;
  userId?: string;
  userEmail?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
