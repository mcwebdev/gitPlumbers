import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, map, catchError, of, switchMap } from 'rxjs';
import { 
  GitHubIssue, 
  CreateGitHubIssueRequest, 
  CreateGitHubIssueResponse,
  GitHubIssueNote 
} from '../models/github-issue.model';

@Injectable({
  providedIn: 'root'
})
export class GitHubIssuesService {
  private readonly _firestore = inject(Firestore);
  private readonly _functions = inject(Functions);

  /**
   * Create a new GitHub issue
   */
  createIssue(request: CreateGitHubIssueRequest): Observable<CreateGitHubIssueResponse> {
    const createIssueFunction = httpsCallable<CreateGitHubIssueRequest, CreateGitHubIssueResponse>(
      this._functions,
      'createGitHubIssue'
    );

    return from(createIssueFunction(request)).pipe(
      map((result) => {
        return result.data;
      }),
      catchError((error) => {
        return of({
          success: false,
          error: error.message || 'Failed to create GitHub issue'
        });
      })
    );
  }

  /**
   * Get all GitHub issues for a specific user
   */
  getUserIssues(userId: string): Observable<GitHubIssue[]> {
    
    const issuesRef = collection(this._firestore, 'githubIssues');
    const q = query(
      issuesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return new Observable(observer => {
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          
          const issues = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data
            } as GitHubIssue;
          });
          
          observer.next(issues);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  /**
   * Get all GitHub issues (for admin dashboard)
   */
  getAllIssues(): Observable<GitHubIssue[]> {
    const issuesRef = collection(this._firestore, 'githubIssues');
    const q = query(
      issuesRef,
      orderBy('createdAt', 'desc')
    );

    return new Observable(observer => {
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const issues = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as GitHubIssue));
          observer.next(issues);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  /**
   * Update issue status
   */
  updateIssueStatus(issueId: string, status: GitHubIssue['status']): Observable<boolean> {
    if (!issueId?.trim()) {
      throw new Error('Issue ID is required to update status');
    }
    if (!status) {
      throw new Error('Status is required to update issue');
    }

    const issueRef = doc(this._firestore, 'githubIssues', issueId);
    
    return from(updateDoc(issueRef, {
      status,
      updatedAt: serverTimestamp()
    })).pipe(
      map(() => true),
      catchError((error) => {
        return of(false);
      })
    );
  }

  /**
   * Remove issue from dashboard only (keeps GitHub issue intact)
   */
  removeIssueFromDashboard(issueId: string): Observable<boolean> {
    const issueRef = doc(this._firestore, 'githubIssues', issueId);
    
    return from(deleteDoc(issueRef)).pipe(
      map(() => {
        return true;
      }),
      catchError((error) => {
        return of(false);
      })
    );
  }

  /**
   * Delete issue completely (from both dashboard and GitHub)
   */
  deleteIssueCompletely(issueId: string, installationId: string, repository: string, githubIssueId: number): Observable<{ success: boolean; error?: string }> {
    
    const deleteIssueFunction = httpsCallable<{
      issueId: string;
      installationId: string;
      repository: string;
      githubIssueId: number;
    }, { success: boolean; error?: string }>(
      this._functions,
      'deleteGitHubIssue'
    );

    return from(deleteIssueFunction({
      issueId,
      installationId,
      repository,
      githubIssueId
    })).pipe(
      map((result) => {
        return result.data;
      }),
      catchError((error) => {
        return of({
          success: false,
          error: error.message || 'Failed to delete GitHub issue'
        });
      })
    );
  }

  /**
   * Add a note to an issue
   */
  addIssueNote(issueId: string, note: Omit<GitHubIssueNote, 'id' | 'createdAt'>): Observable<boolean> {
    if (!issueId?.trim()) {
      throw new Error('Issue ID is required to add a note');
    }
    if (!note?.message?.trim()) {
      throw new Error('Message is required to add a note');
    }

    const issueRef = doc(this._firestore, 'githubIssues', issueId);
    const noteData: GitHubIssueNote = {
      ...note,
      id: this.generateId(),
      createdAt: new Date(),
      message: note.message.trim()
    };

    return from(getDoc(issueRef)).pipe(
      switchMap((docSnapshot) => {
        if (!docSnapshot.exists()) {
          throw new Error(`GitHub issue with ID ${issueId} not found`);
        }
        
        const issueData = docSnapshot.data() as GitHubIssue;
        const currentNotes = issueData.notes || [];
        
        return from(updateDoc(issueRef, {
          notes: [...currentNotes, noteData],
          updatedAt: serverTimestamp()
        }));
      }),
      map(() => true),
      catchError((error) => {
        return of(false);
      })
    );
  }

  /**
   * Get issue by ID
   */
  getIssueById(issueId: string): Observable<GitHubIssue | null> {
    const issueRef = doc(this._firestore, 'githubIssues', issueId);
    
    return new Observable(observer => {
      const unsubscribe = onSnapshot(issueRef, 
        (doc) => {
          if (doc.exists()) {
            observer.next({
              id: doc.id,
              ...doc.data()
            } as GitHubIssue);
          } else {
            observer.next(null);
          }
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  /**
   * Fetch available external GitHub issues for selection
   * This method fetches issues that exist on GitHub but are not yet stored in the app
   */
  fetchAvailableExternalIssues(installationId: string, repository: string): Observable<{ success: boolean; issues: any[]; error?: string }> {
    
    const fetchFunction = httpsCallable<{ installationId: string; repository: string }, { success: boolean; issues: any[]; error?: string }>(
      this._functions,
      'fetchAvailableExternalIssues'
    );

    return from(fetchFunction({ installationId, repository })).pipe(
      map((result) => {
        return result.data;
      }),
      catchError((error) => {
        return of({
          success: false,
          issues: [],
          error: error.message || 'Failed to fetch available external GitHub issues'
        });
      })
    );
  }

  /**
   * Sync selected external GitHub issues
   * This method syncs only the issues that the user has selected
   */
  syncSelectedExternalIssues(installationId: string, repository: string, selectedIssueIds: number[]): Observable<{ success: boolean; count: number; error?: string }> {
    
    const syncFunction = httpsCallable<{ installationId: string; repository: string; selectedIssueIds: number[] }, { success: boolean; count: number; error?: string }>(
      this._functions,
      'syncSelectedExternalIssues'
    );

    return from(syncFunction({ installationId, repository, selectedIssueIds })).pipe(
      map((result) => {
        return result.data;
      }),
      catchError((error) => {
        return of({
          success: false,
          count: 0,
          error: error.message || 'Failed to sync selected external GitHub issues'
        });
      })
    );
  }

  /**
   * Sync external GitHub issues (created directly on GitHub) - Legacy method that syncs all
   * This method can be called to import issues that were created outside the app
   */
  syncExternalIssues(installationId: string, repository: string): Observable<{ success: boolean; count: number; error?: string }> {
    
    const syncFunction = httpsCallable<{ installationId: string; repository: string }, { success: boolean; count: number; error?: string }>(
      this._functions,
      'syncExternalGitHubIssues'
    );

    return from(syncFunction({ installationId, repository })).pipe(
      map((result) => {
        return result.data;
      }),
      catchError((error) => {
        return of({
          success: false,
          count: 0,
          error: error.message || 'Failed to sync external GitHub issues'
        });
      })
    );
  }

  /**
   * Generate a unique ID for notes
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    
    try {
      // Handle Firestore Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      
      // Handle regular Date
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString();
      }
      
      // Handle string or number
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return '';
    }
  }

  /**
   * Get status display information
   */
  getStatusInfo(status: GitHubIssue['status']): { label: string; class: string; icon: string } {
    switch (status) {
      case 'open':
        return { label: 'Open', class: 'status-open', icon: '🔓' };
      case 'in_progress':
        return { label: 'In Progress', class: 'status-progress', icon: '⚙️' };
      case 'waiting_on_user':
        return { label: 'Waiting on You', class: 'status-waiting', icon: '⏳' };
      case 'resolved':
        return { label: 'Resolved', class: 'status-resolved', icon: '✅' };
      case 'closed':
        return { label: 'Closed', class: 'status-closed', icon: '🔒' };
      default:
        return { label: 'Unknown', class: 'status-unknown', icon: '❓' };
    }
  }
}
