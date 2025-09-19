import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Firestore, collection, getDocs, doc, updateDoc, query, orderBy } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, map } from 'rxjs';

interface BlogPostDocument {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  publishedOn: string;
  categorySlug: string;
  summary: string;
  createdAt: any;
}

@Component({
  selector: 'app-blog-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-admin.component.html',
  styleUrl: './blog-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogAdminComponent {
  private readonly firestore = inject(Firestore);

  protected readonly allPosts = toSignal(
    from(getDocs(query(collection(this.firestore, 'blog_posts'), orderBy('createdAt', 'desc')))).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BlogPostDocument)))
    ),
    { initialValue: [] }
  );

  protected readonly publishedPosts = toSignal(
    from(getDocs(query(collection(this.firestore, 'blog_posts'), orderBy('publishedOn', 'desc')))).pipe(
      map(snapshot => snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as BlogPostDocument))
        .filter(post => post.status === 'published')
      )
    ),
    { initialValue: [] }
  );

  protected readonly draftPosts = toSignal(
    from(getDocs(query(collection(this.firestore, 'blog_posts'), orderBy('createdAt', 'desc')))).pipe(
      map(snapshot => snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as BlogPostDocument))
        .filter(post => post.status === 'draft')
      )
    ),
    { initialValue: [] }
  );

  async togglePostStatus(post: BlogPostDocument): Promise<void> {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const postRef = doc(this.firestore, 'blog_posts', post.id);
    await updateDoc(postRef, { 
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  }
}
