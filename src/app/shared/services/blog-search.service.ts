import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, query, where, doc, getDoc } from '@angular/fire/firestore';
import { BlogPost } from '../../features/blog/blog-content';

export interface BlogSearchOptions {
  query?: string;
  category?: string;
  sortBy?: 'newest' | 'oldest' | 'title';
  limit?: number;
}

export interface BlogSearchResult {
  posts: BlogPost[];
  hasMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class BlogSearchService {
  private readonly _firestore = inject(Firestore);

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const docRef = doc(this._firestore, 'blog_posts', slug);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          slug: docSnap.id,
        } as BlogPost;
      }
      return null;
    } catch (error) {
      console.error('Error fetching blog post:', error);
      return null;
    }
  }

  async getPublishedPostsByCategory(
    category: string,
    limit: number = 10,
    excludeSlug?: string
  ): Promise<BlogPost[]> {
    try {
      const q = query(
        collection(this._firestore, 'blog_posts'),
        where('status', '==', 'published'),
        where('categorySlug', '==', category)
      );

      const querySnapshot = await getDocs(q);
      const posts: BlogPost[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const post = {
          ...data,
          slug: doc.id,
        } as BlogPost;

        if (!excludeSlug || post.slug !== excludeSlug) {
          posts.push(post);
        }
      });

      // Sort by published date (newest first)
      posts.sort((a, b) => {
        const dateA = new Date(a.publishedOn).getTime();
        const dateB = new Date(b.publishedOn).getTime();
        return dateB - dateA;
      });

      return posts.slice(0, limit);
    } catch (error) {
      console.error('Error fetching posts by category:', error);
      return [];
    }
  }

  async searchPosts(options: BlogSearchOptions): Promise<BlogSearchResult> {
    try {
      const q = query(
        collection(this._firestore, 'blog_posts'),
        where('status', '==', 'published')
      );

      const querySnapshot = await getDocs(q);
      let posts: BlogPost[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const post = {
          ...data,
          slug: doc.id,
        } as BlogPost;
        posts.push(post);
      });

      // Apply filters
      if (options.category && options.category !== 'all') {
        posts = posts.filter(post => post.categorySlug === options.category);
      }

      if (options.query) {
        const query = options.query.toLowerCase();
        posts = posts.filter(post => 
          post.title.toLowerCase().includes(query) ||
          post.summary.toLowerCase().includes(query) ||
          post.keywords.some(keyword => keyword.toLowerCase().includes(query))
        );
      }

      // Sort
      if (options.sortBy === 'oldest') {
        posts.sort((a, b) => new Date(a.publishedOn).getTime() - new Date(b.publishedOn).getTime());
      } else if (options.sortBy === 'title') {
        posts.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        // newest (default)
        posts.sort((a, b) => new Date(b.publishedOn).getTime() - new Date(a.publishedOn).getTime());
      }

      const limit = options.limit || 10;
      const hasMore = posts.length > limit;

      return {
        posts: posts.slice(0, limit),
        hasMore,
      };
    } catch (error) {
      console.error('Error searching posts:', error);
      return {
        posts: [],
        hasMore: false,
      };
    }
  }
}
