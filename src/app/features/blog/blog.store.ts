import { signalStore, withProps, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { pipe, map, catchError, of, switchMap } from 'rxjs';
import { BlogPost, BlogCategory } from './blog-content';

interface BlogState {
  posts: BlogPost[];
  featuredPosts: BlogPost[];
  recentPosts: BlogPost[];
  loading: boolean;
  error: string | null;
}

export const BlogStore = signalStore(
  { providedIn: 'root' },
  withProps(() => ({
    _firestore: inject(Firestore),
  })),
  withState<BlogState>({
    posts: [],
    featuredPosts: [],
    recentPosts: [],
    loading: false,
    error: null,
  }),
  withComputed((store) => ({
    hasPosts: () => store.posts().length > 0,
    hasFeaturedPosts: () => store.featuredPosts().length > 0,
    hasRecentPosts: () => store.recentPosts().length > 0,
  })),
  withMethods((store) => ({
    loadPosts: rxMethod<void>(
      pipe(
        map(() => {
          patchState(store, { loading: true, error: null });
        }),
        switchMap(() => 
          getDocs(query(
            collection(store._firestore, 'blog_posts'), 
            where('status', '==', 'published')
          ))
        ),
        map(snapshot => {
          const posts = snapshot.docs.map(doc => doc.data() as BlogPost);
          const sortedPosts = posts.sort((a, b) => 
            new Date(b.publishedOn).getTime() - new Date(a.publishedOn).getTime()
          );
          
          patchState(store, {
            posts: sortedPosts,
            featuredPosts: sortedPosts.slice(0, 3),
            recentPosts: sortedPosts.slice(0, 5),
            loading: false,
            error: null,
          });
        }),
        catchError((error) => {
          patchState(store, {
            loading: false,
            error: error.message || 'Failed to load blog posts',
          });
          return of(null);
        })
      )
    ),
    getPostBySlug: (slug: string) => {
      return store.posts().find(post => post.slug === slug);
    },
    getPostsByCategory: (categorySlug: string) => {
      return store.posts().filter(post => post.categorySlug === categorySlug);
    },
    getRelatedPosts: (currentSlug: string, categorySlug: string) => {
      return store.posts()
        .filter(post => post.slug !== currentSlug && post.categorySlug === categorySlug)
        .slice(0, 2);
    },
  })),
  withHooks({
    onInit(store) {
      store.loadPosts();
    },
  })
);
