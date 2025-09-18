import { Injectable, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {
  Firestore,
  addDoc,
  arrayUnion,
  collection,
  collectionData,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { map, Observable, of, tap } from 'rxjs';
import { UserProfile, UserRole } from './auth-user.service';

export type RequestStatus = 'new' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

export interface SupportRequestNote {
  id: string;
  authorId: string;
  authorName: string;
  role: UserRole;
  message: string;
  createdAt: unknown;
}

export interface SupportRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  githubRepo?: string;
  filePath?: string | null;
  status: RequestStatus;
  createdAt: unknown;
  updatedAt: unknown;
  notes: SupportRequestNote[];
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
    console.debug('[RequestsService] createRequest', { user: user.uid });
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
    const isServer = isPlatformServer(this.platformId);
    if (isServer) {
      console.debug('[RequestsService] listenForUserRequests skipped on server', { userId });
      return of([]);
    }
    console.log('[RequestsService] Starting listenForUserRequests', {
      userId,
      firestoreInstance: !!this.firestore,
      firestoreType: this.firestore?.constructor?.name,
    });

    try {
      // Check if firestore is properly initialized
      if (!this.firestore) {
        console.error('[RequestsService] Firestore instance is null/undefined');
        return of([]);
      }

      console.log('[RequestsService] Creating collection reference...');
      const collectionRef = collection(this.firestore, 'supportRequests');
      console.log('[RequestsService] Collection reference created', {
        collectionRef: !!collectionRef,
        collectionType: collectionRef?.constructor?.name,
      });

      console.log('[RequestsService] Creating query with userId:', userId);
      const q = query(collectionRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      console.log('[RequestsService] Query created successfully', {
        query: !!q,
        queryType: q?.constructor?.name,
      });

      console.log('[RequestsService] Setting up collectionData listener...');
      return collectionData(q, { idField: 'id' }).pipe(
        tap({
          next: (docs) => {
            console.log('[RequestsService] listenForUserRequests SUCCESS', {
              userId,
              count: docs?.length || 0,
              docsType: typeof docs,
              isArray: Array.isArray(docs),
              sampleDoc: docs?.[0]
                ? {
                    id: docs[0].id,
                    hasCreatedAt: !!docs[0]['createdAt'],
                    createdAtType: typeof docs[0]['createdAt'],
                    createdAtValue: docs[0]['createdAt'],
                    hasUserId: !!docs[0]['userId'],
                    userIdValue: docs[0]['userId'],
                    userIdMatch: docs[0]['userId'] === userId,
                    allKeys: Object.keys(docs[0]),
                  }
                : 'No documents found',
            });
          },
          error: (error) => {
            console.error('[RequestsService] listenForUserRequests ERROR - Detailed Analysis', {
              userId,
              errorMessage: (error as any)?.message || 'No message',
              errorCode: (error as any)?.code || 'No code',
              errorName: (error as any)?.name || 'No name',
              errorType: typeof error,
              errorConstructor: (error as any)?.constructor?.name || 'No constructor',
              errorStack: (error as any)?.stack || 'No stack trace',
              firestoreState: {
                hasFirestore: !!this.firestore,
                firestoreType: this.firestore?.constructor?.name,
              },
              queryInfo: {
                userId,
                collection: 'supportRequests',
              },
              fullErrorObject: error,
            });
          },
        }),
        map((docs) => {
          console.log('[RequestsService] Mapping documents to SupportRequest[]', {
            count: docs?.length,
            mappedSuccessfully: true,
          });
          return docs as SupportRequest[];
        })
      );
    } catch (error) {
      console.error('[RequestsService] listenForUserRequests SETUP FAILED - Detailed Analysis', {
        userId,
        errorMessage: (error as any)?.message || 'No message',
        errorCode: (error as any)?.code || 'No code',
        errorName: (error as any)?.name || 'No name',
        errorType: typeof error,
        errorConstructor: (error as any)?.constructor?.name || 'No constructor',
        errorStack: (error as any)?.stack || 'No stack trace',
        firestoreState: {
          hasFirestore: !!this.firestore,
          firestoreType: this.firestore?.constructor?.name,
          platformId: this.platformId,
        },
        fullErrorObject: error,
      });
      throw error;
    }
  }

  listenForAllRequests(): Observable<SupportRequest[]> {
    const isServer = isPlatformServer(this.platformId);
    if (isServer) {
      console.debug('[RequestsService] listenForAllRequests skipped on server');
      return of([]);
    }

    console.log('[RequestsService] Starting listenForAllRequests', {
      firestoreInstance: !!this.firestore,
      firestoreType: this.firestore?.constructor?.name,
    });

    try {
      if (!this.firestore) {
        console.error(
          '[RequestsService] Firestore instance is null/undefined for listenForAllRequests'
        );
        return of([]);
      }

      console.log('[RequestsService] Creating collection reference for all requests...');
      const collectionRef = collection(this.firestore, 'supportRequests');
      console.log('[RequestsService] Collection reference created for all requests', {
        collectionRef: !!collectionRef,
        collectionType: collectionRef?.constructor?.name,
      });

      console.log('[RequestsService] Creating query for all requests...');
      const q = query(collectionRef, orderBy('createdAt', 'desc'));
      console.log('[RequestsService] Query created successfully for all requests', {
        query: !!q,
        queryType: q?.constructor?.name,
      });

      console.log('[RequestsService] Setting up collectionData listener for all requests...');
      return collectionData(q, { idField: 'id' }).pipe(
        tap({
          next: (docs) => {
            console.log('[RequestsService] listenForAllRequests SUCCESS', {
              count: docs?.length || 0,
              docsType: typeof docs,
              isArray: Array.isArray(docs),
              sampleDoc: docs?.[0]
                ? {
                    id: docs[0].id,
                    hasCreatedAt: !!docs[0]['createdAt'],
                    createdAtType: typeof docs[0]['createdAt'],
                    createdAtValue: docs[0]['createdAt'],
                    hasUserId: !!docs[0]['userId'],
                    userIdValue: docs[0]['userId'],
                    status: docs[0]['status'],
                    allKeys: Object.keys(docs[0]),
                  }
                : 'No documents found',
            });
          },
          error: (error) => {
            console.error('[RequestsService] listenForAllRequests ERROR - Detailed Analysis', {
              errorMessage: (error as any)?.message || 'No message',
              errorCode: (error as any)?.code || 'No code',
              errorName: (error as any)?.name || 'No name',
              errorType: typeof error,
              errorConstructor: (error as any)?.constructor?.name || 'No constructor',
              errorStack: (error as any)?.stack || 'No stack trace',
              firestoreState: {
                hasFirestore: !!this.firestore,
                firestoreType: this.firestore?.constructor?.name,
              },
              queryInfo: {
                collection: 'supportRequests',
                orderBy: 'createdAt desc',
              },
              fullErrorObject: error,
            });
          },
        }),
        map((docs) => {
          console.log('[RequestsService] Mapping all documents to SupportRequest[]', {
            count: docs?.length,
            mappedSuccessfully: true,
          });
          return docs as SupportRequest[];
        })
      );
    } catch (error) {
      console.error('[RequestsService] listenForAllRequests SETUP FAILED - Detailed Analysis', {
        errorMessage: (error as any)?.message || 'No message',
        errorCode: (error as any)?.code || 'No code',
        errorName: (error as any)?.name || 'No name',
        errorType: typeof error,
        errorConstructor: (error as any)?.constructor?.name || 'No constructor',
        errorStack: (error as any)?.stack || 'No stack trace',
        firestoreState: {
          hasFirestore: !!this.firestore,
          firestoreType: this.firestore?.constructor?.name,
          platformId: this.platformId,
        },
        fullErrorObject: error,
      });
      throw error;
    }
  }

  async updateStatus(requestId: string, status: RequestStatus): Promise<void> {
    console.debug('[RequestsService] updateStatus', { requestId, status });
    const ref = doc(this.firestore, 'supportRequests', requestId);
    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  async addNote(requestId: string, author: UserProfile, message: string): Promise<void> {
    console.debug('[RequestsService] addNote', { requestId, authorId: author.uid });
    const ref = doc(this.firestore, 'supportRequests', requestId);
    const note: SupportRequestNote = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
      authorId: author.uid,
      authorName: author.displayName,
      role: author.role,
      message,
      createdAt: serverTimestamp(),
    };

    await updateDoc(ref, {
      notes: arrayUnion(note),
      updatedAt: serverTimestamp(),
    });
  }
}
