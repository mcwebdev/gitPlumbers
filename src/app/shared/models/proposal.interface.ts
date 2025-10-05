/**
 * Proposal Status
 */
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'revision_requested';

/**
 * Proposal Item
 */
export interface ProposalItem {
  productName: string;
  description: string;
  unitAmount: number; // in cents
  quantity: number;
  currency: string;
}

/**
 * Proposal Interface
 */
export interface Proposal {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  items: ProposalItem[];
  status: ProposalStatus;
  totalAmount: number; // in cents
  currency: string;
  createdAt: unknown;
  updatedAt: unknown;
  sentAt?: unknown;
  respondedAt?: unknown;
  notes?: ProposalNote[];
  metadata?: Record<string, any>;
}

/**
 * Proposal Note (for communication)
 */
export interface ProposalNote {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  message: string;
  createdAt: unknown;
  role: 'admin' | 'customer';
}

/**
 * Create Proposal Request
 */
export interface CreateProposalRequest {
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  items: ProposalItem[];
  currency: string;
}

/**
 * Update Proposal Request
 */
export interface UpdateProposalRequest {
  title?: string;
  description?: string;
  items?: ProposalItem[];
  status?: ProposalStatus;
}
