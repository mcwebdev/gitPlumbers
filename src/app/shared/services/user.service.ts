import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { UserProfile } from './auth-user.service'; // Adjust path if needed
import { UserRole } from './auth-user.service'; // Added import for UserRole

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly _firestore = inject(Firestore);

  async listUsers(): Promise<UserProfile[]> {
    try {
      const usersRef = collection(this._firestore, 'users');
      const snapshot = await getDocs(usersRef);
      
      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Validate required fields
        if (!data['email'] || !data['displayName'] || !data['role']) {
          throw new Error(`Invalid user data for document ${doc.id}: Missing required fields`);
        }

        return {
          uid: doc.id,
          email: data['email'] as string || '',
          displayName: data['displayName'] as string || '',
          role: data['role'] as UserRole || 'user',
          stripeCustomerId: data['stripeCustomerId'] as string | undefined,
          githubInstallationId: data['githubInstallationId'] as string | undefined,
          createdAt: data['createdAt'],
          updatedAt: data['updatedAt'],
        } as UserProfile;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list users: ${errorMessage}`);
    }
  }
}
