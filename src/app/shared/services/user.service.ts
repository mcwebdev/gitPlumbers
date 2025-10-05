import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { UserProfile } from './auth-user.service'; // Adjust path if needed
import { UserRole } from './auth-user.service'; // Added import for UserRole

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _firestore = inject(Firestore);

  async listUsers(): Promise<UserProfile[]> {
    // ONLY run on client
    if (typeof window === 'undefined') {
      console.log('UserService.listUsers: Skipping on server-side');
      return [];
    }

    const startTime = performance.now();
    console.log('UserService.listUsers: Starting getDocs call...');

    try {
      const usersRef = collection(this._firestore, 'users');
      const snapshot = await getDocs(usersRef);
      const getDocsTime = performance.now() - startTime;
      console.log(`UserService.listUsers: getDocs completed in ${getDocsTime.toFixed(2)}ms, got ${snapshot.size} docs`);

      if (snapshot.empty) {
        return [];
      }

      const users = snapshot.docs.map(doc => {
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

      const totalTime = performance.now() - startTime;
      console.log(`UserService.listUsers: Total time ${totalTime.toFixed(2)}ms, returning ${users.length} users`);
      return users;
    } catch (error) {
      console.error('UserService.listUsers: ERROR:', error);
      return [];
    }
  }
}
