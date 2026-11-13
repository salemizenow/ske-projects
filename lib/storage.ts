// S3-compatible presigned URLs (AWS Signature V4, query string), built on node:crypto. Works with S3, R2, Spaces.
import { createHash, createHmac } from 'node:crypto';

export interface S3Config { bucket: string; region: string; accessKeyId: string; secretAccessKey: string; endpoint?: string }

export function s3FromEnv(env: Record<string, string | undefined> = process.env): S3Config | null {
  const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT } = env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  return { bucket: S3_BUCKET, region: S3_REGION || 'us-east-1', accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, endpoint: S3_ENDPOINT || undefined };
}

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (k: Buffer | string, s: string) => createHmac('sha256', k).update(s).digest();
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function presign(cfg: S3Config, opts: { method: 'GET' | 'PUT'; key: string; expires?: number; now?: Date; virtualHost?: boolean; contentDisposition?: string }) {
  const now = opts.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const date = amzDate.slice(0, 8);
  const virtual = opts.virtualHost ?? !cfg.endpoint;
  const base = cfg.endpoint ? new URL(cfg.endpoint) : new URL(`https://s3.${cfg.region}.amazonaws.com`);
  const host = virtual ? `${cfg.bucket}.${base.host}` : base.host;
  const path = (virtual ? '' : '/' + cfg.bucket) + '/' + opts.key.split('/').map(enc).join('/');
  const scope = `${date}/${cfg.region}/s3/aws4_request`;
  const q: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${cfg.accessKeyId}/${scope}`, 'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(opts.expires ?? 300), 'X-Amz-SignedHeaders': 'host',
  };
  if (opts.contentDisposition) q['response-content-disposition'] = opts.contentDisposition;
  const qs = Object.keys(q).sort().map((k) => `${enc(k)}=${enc(q[k])}`).join('&');
  const canonical = [opts.method, path, qs, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha(canonical)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac('AWS4' + cfg.secretAccessKey, date), cfg.region), 's3'), 'aws4_request');
  const sig = createHmac('sha256', kSigning).update(toSign).digest('hex');
  return `${base.protocol}//${host}${path}?${qs}&X-Amz-Signature=${sig}`;
}

/** Safe object key: projects/<code>/<random>-<cleaned file name> */
export function objectKey(projectCode: string, fileName: string, rand: string) {
  const clean = fileName.normalize('NFKD').replace(/[^\w.\-]+/g, '-').replace(/\.{2,}/g, '.').replace(/-+/g, '-').slice(-80) || 'file';
  return `projects/${projectCode}/${rand}-${clean}`;
}
