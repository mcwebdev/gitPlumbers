import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  collectionData,
  serverTimestamp,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, of, map, catchError } from 'rxjs';
import {
  Proposal,
  ProposalStatus,
  CreateProposalRequest,
  UpdateProposalRequest,
  ProposalNote,
} from '../models/proposal.interface';
import { UserProfile } from './auth-user.service';

@Injectable({ providedIn: 'root' })
export class ProposalService {
  private readonly firestore = inject(Firestore);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Create a new proposal
   */
  async createProposal(payload: CreateProposalRequest): Promise<string> {
    if (!payload?.userId) {
      throw new Error('User ID is required to create a proposal');
    }
    if (!payload?.title?.trim()) {
      throw new Error('Title is required to create a proposal');
    }
    if (!payload?.items || payload.items.length === 0) {
      throw new Error('At least one item is required to create a proposal');
    }

    // Calculate total amount
    const totalAmount = payload.items.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0
    );

    const docRef = await addDoc(collection(this.firestore, 'proposals'), {
      userId: payload.userId,
      userEmail: payload.userEmail,
      userName: payload.userName,
      title: payload.title,
      description: payload.description || '',
      items: payload.items,
      status: 'draft' satisfies ProposalStatus,
      totalAmount,
      currency: payload.currency || 'usd',
      notes: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  /**
   * Update an existing proposal
   */
  async updateProposal(proposalId: string, payload: UpdateProposalRequest): Promise<void> {
    if (!proposalId) {
      throw new Error('Proposal ID is required to update a proposal');
    }

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (payload.title !== undefined) {
      updateData.title = payload.title;
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description;
    }
    if (payload.items !== undefined) {
      updateData.items = payload.items;
      // Recalculate total
      updateData.totalAmount = payload.items.reduce(
        (sum, item) => sum + item.unitAmount * item.quantity,
        0
      );
    }
    if (payload.status !== undefined) {
      updateData.status = payload.status;
      if (payload.status === 'sent') {
        updateData.sentAt = serverTimestamp();
      }
      if (payload.status === 'accepted' || payload.status === 'rejected') {
        updateData.respondedAt = serverTimestamp();
      }
    }

    const docRef = doc(this.firestore, 'proposals', proposalId);
    await updateDoc(docRef, updateData);
  }

  /**
   * Delete a proposal
   */
  async deleteProposal(proposalId: string): Promise<void> {
    if (!proposalId) {
      throw new Error('Proposal ID is required to delete a proposal');
    }

    const docRef = doc(this.firestore, 'proposals', proposalId);
    await deleteDoc(docRef);
  }

  /**
   * Add a note to a proposal
   */
  async addNote(proposalId: string, author: UserProfile, message: string): Promise<void> {
    if (!proposalId) {
      throw new Error('Proposal ID is required to add a note');
    }
    if (!message?.trim()) {
      throw new Error('Message is required to add a note');
    }

    const docRef = doc(this.firestore, 'proposals', proposalId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Proposal not found');
    }

    const proposal = docSnap.data() as Proposal;
    const notes = proposal.notes || [];

    const newNote: ProposalNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId: author.uid,
      authorName: author.displayName || author.email,
      authorEmail: author.email,
      message: message.trim(),
      createdAt: Date.now(), // Use Date.now() instead of serverTimestamp() for array items
      role: author.role === 'admin' ? 'admin' : 'customer',
    };

    await updateDoc(docRef, {
      notes: [...notes, newNote],
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Listen for proposals for a specific user
   */
  listenForUserProposals(userId: string): Observable<Proposal[]> {
    if (!userId?.trim()) {
      throw new Error('User ID is required to listen for user proposals');
    }

    const isServer = isPlatformServer(this.platformId);
    if (isServer) {
      return of([]);
    }

    if (!this.firestore) {
      throw new Error('Firestore instance is not available');
    }

    try {
      const collectionRef = collection(this.firestore, 'proposals');
      const q = query(collectionRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

      return collectionData(q, { idField: 'id' }).pipe(
        map((proposals) => proposals as Proposal[]),
        catchError((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error listening for user proposals:', errorMessage);
          return of([]);
        })
      );
    } catch (error) {
      console.error('Failed to set up user proposals listener:', error);
      return of([]);
    }
  }

  /**
   * Listen for all proposals (admin)
   */
  listenForAllProposals(): Observable<Proposal[]> {
    const isServer = isPlatformServer(this.platformId);
    if (isServer) {
      return of([]);
    }

    if (!this.firestore) {
      throw new Error('Firestore instance is not available');
    }

    try {
      const collectionRef = collection(this.firestore, 'proposals');
      const q = query(collectionRef, orderBy('createdAt', 'desc'));

      return collectionData(q, { idField: 'id' }).pipe(
        map((proposals) => proposals as Proposal[]),
        catchError((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error listening for all proposals:', errorMessage);
          return of([]);
        })
      );
    } catch (error) {
      console.error('Failed to set up all proposals listener:', error);
      return of([]);
    }
  }

  /**
   * Get a single proposal by ID
   */
  async getProposal(proposalId: string): Promise<Proposal | null> {
    if (!proposalId) {
      throw new Error('Proposal ID is required to get a proposal');
    }

    const docRef = doc(this.firestore, 'proposals', proposalId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as Proposal;
  }
}
