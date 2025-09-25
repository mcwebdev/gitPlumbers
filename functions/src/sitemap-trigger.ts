import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const db = getFirestore();

/**
 * Trigger to invalidate sitemap cache when new blog posts are published
 */
export const onBlogPostCreated = onDocumentCreated(
  'blog_posts/{postId}',
  async (event) => {
    const post = event.data?.data();

    if (post && post.published) {
      logger.info(`New blog post published: ${post.title} (${post.slug})`);
      await invalidateSitemapCache();
    }
  }
);

/**
 * Trigger to invalidate sitemap cache when blog posts are updated
 */
export const onBlogPostUpdated = onDocumentUpdated(
  'blog_posts/{postId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Check if publication status changed or if post was updated
    const wasPublished = beforeData?.published;
    const isPublished = afterData?.published;
    const wasUpdated = beforeData?.updatedAt !== afterData?.updatedAt;

    if ((wasPublished !== isPublished) || (isPublished && wasUpdated)) {
      logger.info(`Blog post updated: ${afterData?.title} (${afterData?.slug})`);
      await invalidateSitemapCache();
    }
  }
);

/**
 * Invalidate sitemap cache by updating a cache control document
 */
async function invalidateSitemapCache(): Promise<void> {
  try {
    // Update a cache control document to trigger sitemap regeneration
    await db.collection('_cache').doc('sitemap').set({
      lastInvalidated: new Date().toISOString(),
      version: Date.now(),
    }, { merge: true });

    logger.info('Sitemap cache invalidated successfully');
  } catch (error) {
    logger.error('Error invalidating sitemap cache:', error);
  }
}
