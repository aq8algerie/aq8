import { getAdminDb } from './serverFirebaseAdmin';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toPlainFirestoreData } from './firestoreSerialization';
import {
  isBlogPostPubliclyVisible,
  normalizeStoredBlogPost,
  type BlogPost,
  type BlogCategory,
} from './blog';

function hasAdminCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CONFIG ||
    process.env.K_SERVICE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

export async function getServerPublishedBlogPosts(
  category?: BlogCategory,
): Promise<BlogPost[]> {
  const now = new Date();
  let rawDocs: { id: string; data: Record<string, any> }[] = [];

  if (hasAdminCredentials()) {
    try {
      const snapshot = await getAdminDb().collection('blog_posts').get();
      rawDocs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    } catch (adminError) {
      console.warn(
        '[public-blog] Firestore Admin query failed, trying Web SDK:',
        adminError instanceof Error ? adminError.message : String(adminError),
      );
    }
  }

  if (rawDocs.length === 0) {
    try {
      const q = query(collection(db, 'blog_posts'), where('status', '==', 'published'));
      const webSnapshot = await getDocs(q);
      rawDocs = webSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    } catch (webError) {
      console.error(
        '[public-blog] Firestore Web SDK query failed:',
        webError instanceof Error ? webError.message : String(webError),
      );
    }
  }

  return rawDocs
    .map(doc => normalizeStoredBlogPost(
      toPlainFirestoreData({ ...doc.data, id: doc.id }) as BlogPost,
    ))
    .filter(post => isBlogPostPubliclyVisible(post, now) && (!category || post.category === category))
    .sort((left, right) => {
      const leftDate = left.publishedAt || left.scheduledAt || left.updatedAt || '';
      const rightDate = right.publishedAt || right.scheduledAt || right.updatedAt || '';
      return rightDate.localeCompare(leftDate);
    });
}

export async function getServerPublishedBlogPostBySlug(
  slug: string,
): Promise<BlogPost | undefined> {
  const posts = await getServerPublishedBlogPosts();
  return posts.find(post => post.slug === slug);
}
