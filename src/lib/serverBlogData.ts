import 'server-only';
import { getAdminDb } from './serverFirebaseAdmin';
import { toPlainFirestoreData } from './firestoreSerialization';
import type { BlogPost, BlogCategory } from './blog';

const BLOG_DATA_TIMEOUT_MS = 4_000;

async function withBlogTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Firestore blog unavailable after ${BLOG_DATA_TIMEOUT_MS}ms`)),
          BLOG_DATA_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getServerPublishedBlogPosts(
  category?: BlogCategory,
): Promise<BlogPost[]> {
  try {
    const snapshot = await withBlogTimeout(getAdminDb().collection('blog_posts').get());
    return snapshot.docs
      .map(doc => toPlainFirestoreData({ ...doc.data(), id: doc.id }) as BlogPost)
      .filter(post => post.status === 'published' && (!category || post.category === category))
      .sort((left, right) => {
        const leftDate = left.publishedAt || left.updatedAt || '';
        const rightDate = right.publishedAt || right.updatedAt || '';
        return rightDate.localeCompare(leftDate);
      });
  } catch (error) {
    console.warn(
      '[public-blog] Firestore unavailable, returning an empty editorial feed.',
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

export async function getServerPublishedBlogPostBySlug(
  slug: string,
): Promise<BlogPost | undefined> {
  const posts = await getServerPublishedBlogPosts();
  return posts.find(post => post.slug === slug);
}

