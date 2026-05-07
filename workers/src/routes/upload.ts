import type { Env, SessionData } from '../types';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleUpload(
  path: string,
  request: Request,
  env: Env,
  session: SessionData
): Promise<Response | null> {
  if (path === '/upload/image' && request.method === 'POST') {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || typeof file !== 'object' || !('size' in file)) {
      return json({ error: 'ファイルが指定されていません' }, 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return json({ error: '許可されていないファイル形式です' }, 400);
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      return json({ error: 'ファイルサイズは5MB以下にしてください' }, 400);
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const key = `images/${session.userId}/${crypto.randomUUID()}.${ext}`;

    await env.IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    // Worker proxy URL: GET /v1/images/{key}
    const workerOrigin = new URL(request.url).origin;
    const imageUrl = `${workerOrigin}/v1/images/${key}`;

    return json({ url: imageUrl });
  }

  return null;
}
