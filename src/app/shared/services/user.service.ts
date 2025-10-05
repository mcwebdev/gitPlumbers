import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { Observable, defer, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UserProfile } from './auth-user.service'; // Adjust path if needed
import { UserRole } from './auth-user.service'; // Added import for UserRole

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _firestore = inject(Firestore);

  listUsers(): Observable<UserProfile[]> {
    return defer(() => {
      if (typeof window === 'undefined') {
        console.log('UserService.listUsers: Skipping on server-side');
        return of([]);
      }

      console.log('UserService.listUsers: Starting getDocs call...');
      const usersRef = collection(this._firestore, 'users');
      return from(getDocs(usersRef)).pipe(
        map(snapshot => {
          if (snapshot.empty) {
            return [];
          }
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              uid: doc.id,
              email: data['email'] || '',
              displayName: data['displayName'] || '',
              role: data['role'] || 'user',
              stripeCustomerId: data['stripeCustomerId'],
              githubInstallationId: data['githubInstallationId'],
              createdAt: data['createdAt'],
              updatedAt: data['updatedAt'],
            } as UserProfile;
          });
        }),
        catchError(error => {
          console.error('UserService.listUsers: ERROR:', error);
          return of([]);
        })
      );
    });
  }
}
