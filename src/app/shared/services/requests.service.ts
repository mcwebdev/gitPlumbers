import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  collectionData,
  serverTimestamp,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, of, map, catchError } from 'rxjs';
import { UserProfile } from './auth-user.service';

export type RequestStatus = 'new' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

export interface SupportRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  githubRepo: string;
  filePath: string | null;
  status: RequestStatus;
  notes: RequestNote[];
  createdAt: unknown;
  updatedAt: unknown;
}

export interface RequestNote {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  role: 'user' | 'admin';
  message: string;
  createdAt: unknown;
}

export interface CreateSupportRequestPayload {
  message: string;
  githubRepo?: string;
  filePath?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly firestore = inject(Firestore);
  private readonly platformId = inject(PLATFORM_ID);

  async createRequest(user: UserProfile, payload: CreateSupportRequestPayload): Promise<string> {
    if (!user?.uid) {
      throw new Error('User ID is required to create a support request');
    }
    if (!payload?.message?.trim()) {
      throw new Error('Message is required to create a support request');
    }

    const docRef = await addDoc(collection(this.firestore, 'supportRequests'), {
      userId: user.uid,
      userName: user.displayName || user.email,
      userEmail: user.email,
      message: payload.message,
      githubRepo: payload.githubRepo ?? '',
      filePath: payload.filePath ?? null,
      status: 'new' satisfies RequestStatus,
      notes: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  listenForUserRequests(userId: string): Observable<SupportRequest[]> {
    if (!userId?.trim()) {
      throw new Error('User ID is required to listen for user requests');
    }

    const isServer = isPlatformServer(this.platformId);
    if (isServer) {
      return of([]);
    }

    if (!this.firestore) {
      throw new Error('Firestore instance is not available');
    }

    try {
      const collectionRef = collection(this.firestore, 'supportRequests');
      const q = query(collectionRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

      return collectionData(q, { idField: 'id' }).pipe(
        catchError((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to listen for user requests: ${errorMessage}`);
        }),
        map((docs) => {
          return docs.map((doc) => ({
            id: doc.id,
            userId: doc['userId'],
            userName: doc['userName'],
            userEmail: doc['userEmail'],
            message: doc['message'],
            githubRepo: doc['githubRepo'],
            filePath: doc['filePath'],
            status: doc['status'] as RequestStatus,
            notes: doc['notes'] || [],
            createdAt: doc['createdAt'],
            updatedAt: doc['updatedAt'],
          }));
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to setup user requests listener: ${errorMessage}`);
    }
  }

  listenForAllRequests(): Observable<SupportRequest[]> {
    const isServer = isPlatformServer(this.platformId);
    if (isServer) {
      return of([]);
    }

    if (!this.firestore) {
      throw new Error('Firestore instance is not available');
    }

    try {
      const collectionRef = collection(this.firestore, 'supportRequests');
      const q = query(collectionRef, orderBy('createdAt', 'desc'));

      return collectionData(q, { idField: 'id' }).pipe(
        catchError((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to listen for all requests: ${errorMessage}`);
        }),
        map((docs) => {
          return docs.map((doc) => ({
            id: doc.id,
            userId: doc['userId'],
            userName: doc['userName'],
            userEmail: doc['userEmail'],
            message: doc['message'],
            githubRepo: doc['githubRepo'],
            filePath: doc['filePath'],
            status: doc['status'] as RequestStatus,
            notes: doc['notes'] || [],
            createdAt: doc['createdAt'],
            updatedAt: doc['updatedAt'],
          }));
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to setup all requests listener: ${errorMessage}`);
    }
  }

  async updateStatus(requestId: string, status: RequestStatus): Promise<void> {
    if (!requestId?.trim()) {
      throw new Error('Request ID is required to update status');
    }
    if (!status) {
      throw new Error('Status is required to update request');
    }

    const docRef = doc(this.firestore, 'supportRequests', requestId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  async addNote(requestId: string, author: UserProfile, message: string): Promise<void> {
    if (!requestId?.trim()) {
      throw new Error('Request ID is required to add a note');
    }
    if (!author?.uid) {
      throw new Error('Author information is required to add a note');
    }
    if (!message?.trim()) {
      throw new Error('Message is required to add a note');
    }

    const docRef = doc(this.firestore, 'supportRequests', requestId);
    const newNote: RequestNote = {
      id: Date.now().toString(),
      authorId: author.uid,
      authorName: author.displayName || author.email,
      authorEmail: author.email,
      role: author.role,
      message: message.trim(),
      createdAt: new Date(), // Use regular Date instead of serverTimestamp() for array items
    };

    // Get current notes and add the new one
    const currentDoc = await getDoc(docRef);
    const currentData = currentDoc.data();
    const currentNotes = currentData?.['notes'] || [];

    await updateDoc(docRef, {
      notes: [...currentNotes, newNote],
      updatedAt: serverTimestamp(),
    });
  }
}
