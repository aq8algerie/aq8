import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import {
  CrmAccessError,
  getCrmErrorResponse,
  verifyServerCrmAccess,
} from '@/src/lib/serverCrmAccess';
import { validateBlogPostDraft, type BlogPost } from '@/src/lib/blog';
import { toPlainFirestoreData } from '@/src/lib/firestoreSerialization';

export const dynamic = 'force-dynamic';

async function ensureUniqueSlug(slug: string, currentId?: string): Promise<void> {
  const snapshot = await getAdminDb()
    .collection('blog_posts')
    .where('slug', '==', slug)
    .limit(2)
    .get();
  const conflict = snapshot.docs.some(doc => doc.id !== currentId);
  if (conflict) {
    throw new CrmAccessError('Cette URL est déjà utilisée par un autre article.', 409);
  }
}

async function appendEditorialAudit(
  actor: Awaited<ReturnType<typeof verifyServerCrmAccess>>,
  action: string,
  details: string,
  targetId: string,
): Promise<void> {
  await getAdminDb().collection('audit_logs').add({
    timestamp: new Date().toISOString(),
    userId: actor.uid,
    userName: actor.name,
    role: actor.role,
    action,
    details,
    targetId,
    targetType: 'blog_post',
    centerId: null,
    centerName: null,
  });
}

async function clearOtherFeaturedPosts(postId: string): Promise<void> {
  const snapshot = await getAdminDb()
    .collection('blog_posts')
    .where('featured', '==', true)
    .get();
  if (snapshot.empty) return;

  const batch = getAdminDb().batch();
  snapshot.docs.forEach(doc => {
    if (doc.id !== postId) {
      batch.update(doc.ref, { featured: false, updatedAt: new Date().toISOString() });
    }
  });
  await batch.commit();
}

function serializePost(id: string, value: FirebaseFirestore.DocumentData): BlogPost {
  return toPlainFirestoreData({ ...value, id }) as BlogPost;
}

export async function GET(request: Request) {
  try {
    await verifyServerCrmAccess(request, ['super_admin']);
    const snapshot = await getAdminDb().collection('blog_posts').get();
    const posts = snapshot.docs
      .map(doc => serializePost(doc.id, doc.data()))
      .sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''));
    return NextResponse.json({ ok: true, posts });
  } catch (error) {
    console.error('[blog-posts:get] failed:', error);
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin']);
    const body = await request.json().catch(() => null) as { post?: unknown } | null;
    const validation = validateBlogPostDraft(body?.post);
    if ('error' in validation) {
      throw new CrmAccessError(validation.error, 400);
    }

    await ensureUniqueSlug(validation.data.slug);
    const now = new Date().toISOString();
    const ref = getAdminDb().collection('blog_posts').doc();
    const post: Omit<BlogPost, 'id'> = {
      ...validation.data,
      publishedAt: validation.data.status === 'published'
        ? validation.data.publishedAt || now
        : null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(post);
    if (post.featured && post.status === 'published') {
      await clearOtherFeaturedPosts(ref.id);
    }
    await appendEditorialAudit(
      actor,
      post.status === 'published' ? 'PUBLISH_BLOG_POST' : 'CREATE_BLOG_POST',
      `${post.status === 'published' ? 'Publication' : 'Création'} de l’article : ${post.title}`,
      ref.id,
    );
    return NextResponse.json({ ok: true, post: serializePost(ref.id, post) }, { status: 201 });
  } catch (error) {
    console.error('[blog-posts:create] failed:', error);
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin']);
    const body = await request.json().catch(() => null) as { id?: unknown; post?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) throw new CrmAccessError('Identifiant de l’article manquant.', 400);

    const ref = getAdminDb().collection('blog_posts').doc(id);
    const currentSnapshot = await ref.get();
    if (!currentSnapshot.exists) throw new CrmAccessError('Article introuvable.', 404);

    const validation = validateBlogPostDraft(body?.post);
    if ('error' in validation) {
      throw new CrmAccessError(validation.error, 400);
    }
    await ensureUniqueSlug(validation.data.slug, id);

    const current = currentSnapshot.data() as BlogPost;
    const now = new Date().toISOString();
    const isFirstPublication = current.status !== 'published' && validation.data.status === 'published';
    const post: Omit<BlogPost, 'id'> = {
      ...validation.data,
      publishedAt: validation.data.status === 'published'
        ? current.publishedAt || validation.data.publishedAt || now
        : current.publishedAt || validation.data.publishedAt || null,
      createdAt: current.createdAt || now,
      updatedAt: now,
    };
    await ref.set(post);
    if (post.featured && post.status === 'published') {
      await clearOtherFeaturedPosts(id);
    }

    const action = validation.data.status === 'archived'
      ? 'ARCHIVE_BLOG_POST'
      : isFirstPublication
        ? 'PUBLISH_BLOG_POST'
        : 'UPDATE_BLOG_POST';
    await appendEditorialAudit(actor, action, `Mise à jour de l’article : ${post.title}`, id);
    return NextResponse.json({ ok: true, post: serializePost(id, post) });
  } catch (error) {
    console.error('[blog-posts:update] failed:', error);
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin']);
    const id = new URL(request.url).searchParams.get('id')?.trim() || '';
    if (!id) throw new CrmAccessError('Identifiant de l’article manquant.', 400);

    const ref = getAdminDb().collection('blog_posts').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new CrmAccessError('Article introuvable.', 404);
    const post = snapshot.data() as BlogPost;
    if (post.status === 'published') {
      throw new CrmAccessError(
        'Archivez ou repassez l’article en brouillon avant de le supprimer définitivement.',
        409,
      );
    }

    await ref.delete();
    await appendEditorialAudit(actor, 'DELETE_BLOG_POST', `Suppression de l’article : ${post.title}`, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[blog-posts:delete] failed:', error);
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}

