import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, catchError, throwError, switchMap } from 'rxjs';
import {
  SupportRequest,
  CreateSupportRequestRequest,
  UpdateSupportRequestRequest,
  SupportRequestFilters,
} from '../models/support-request.interface';

@Injectable({
  providedIn: 'root',
})
export class SupportRequestsService {
  private firestore = inject(Firestore);
  private readonly collectionName = 'supportRequests';

  getSupportRequests(filters?: SupportRequestFilters): Observable<SupportRequest[]> {
    const supportRequestsRef = collection(this.firestore, this.collectionName);
    let q = query(supportRequestsRef, orderBy('createdAt', 'desc'));

    // Apply filters if provided
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters?.userEmail) {
      q = query(q, where('userEmail', '==', filters.userEmail));
    }

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
          } as SupportRequest;
        });
      }),
      catchError((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return throwError(() => new Error(`Failed to fetch support requests: ${errorMessage}`));
      })
    );
  }

  getSupportRequestById(id: string): Observable<SupportRequest> {
    const docRef = doc(this.firestore, this.collectionName, id);

    return from(getDoc(docRef)).pipe(
      map((doc) => {
        if (!doc.exists()) {
          throw new Error('Support request not found');
        }

        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
        } as SupportRequest;
      }),
      catchError((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return throwError(() => new Error(`Failed to fetch support request: ${errorMessage}`));
      })
    );
  }

  createSupportRequest(
    request: CreateSupportRequestRequest,
    userId: string,
    userEmail: string,
    userName: string
  ): Observable<SupportRequest> {
    const supportRequestsRef = collection(this.firestore, this.collectionName);

    const newRequest = {
      ...request,
      userId,
      userEmail,
      userName,
      status: 'new' as const,
      notes: request.notes || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(addDoc(supportRequestsRef, newRequest)).pipe(
      map(
        (docRef) =>
          ({
            id: docRef.id,
            ...newRequest,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as SupportRequest)
      ),
      catchError((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return throwError(() => new Error(`Failed to create support request: ${errorMessage}`));
      })
    );
  }

  updateSupportRequest(
    id: string,
    updates: UpdateSupportRequestRequest
  ): Observable<SupportRequest> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    return from(updateDoc(docRef, updateData)).pipe(
      switchMap(() => this.getSupportRequestById(id)),
      catchError((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return throwError(() => new Error(`Failed to update support request: ${errorMessage}`));
      })
    );
  }

  getUserSupportRequests(userId: string): Observable<SupportRequest[]> {
    return this.getSupportRequests({ userId });
  }

  getSupportRequestsByStatus(status: SupportRequest['status']): Observable<SupportRequest[]> {
    return this.getSupportRequests({ status });
  }
}
