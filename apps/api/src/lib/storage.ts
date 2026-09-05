import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { config } from '../config.js';

// The only file that knows about S3; swapping the backend touches only this one.
const client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint, // set ⇒ S3-compatible server (RustFS); unset ⇒ AWS
  forcePathStyle: config.s3.forcePathStyle,
  credentials: config.s3.accessKeyId
    ? { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey }
    : undefined, // unset ⇒ SDK default chain (env / IAM role)
});

// Keys are immutable (random name), so cache hard.
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

// S3 delete is idempotent — a missing key still returns success.
export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
}

// null when the object is gone, so the caller can answer 404 not 500.
export async function getObject(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
} | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
    return {
      body: res.Body as Readable,
      contentType: res.ContentType,
      contentLength: res.ContentLength,
    };
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

// Points at the API's /media route, not the bucket — the bucket stays private.
export function publicUrl(key: string): string {
  return `${config.media.publicBaseUrl}/${key}`;
}
