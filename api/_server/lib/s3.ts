import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3: S3Client | null = null;

function getS3() {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }
  return s3;
}

export async function generateUploadUrl(filename: string, contentType: string) {
  const bucket = process.env.AWS_S3_BUCKET ?? '';
  const region = process.env.AWS_REGION ?? 'ap-northeast-2';
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `media/${crypto.randomUUID()}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: 300 });
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl, key };
}
