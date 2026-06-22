import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    const accessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || null;

    if (accessKey && secretKey && this.bucketName) {
      this.logger.log('Configuring production AWS S3 storage mode.');
      this.s3Client = new S3Client({
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        region,
      });
    } else {
      this.logger.log('AWS S3 credentials not provided. Using Local Disk storage mode.');
      this.uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }
  }

  async saveFile(fileName: string, buffer: Buffer): Promise<string> {
    const uniqueName = `${Date.now()}-${fileName}`;

    if (this.s3Client && this.bucketName) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: uniqueName,
            Body: buffer,
          })
        );
        return `s3://${this.bucketName}/${uniqueName}`;
      } catch (err) {
        this.logger.error(`S3 Upload failed: ${err.message}. Falling back to local copy.`);
      }
    }

    // Local Disk storage fallback
    const filePath = path.join(this.uploadDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);
    return `uploads/${uniqueName}`;
  }

  async readFile(fileKey: string): Promise<Buffer> {
    if (fileKey.startsWith('s3://') && this.s3Client) {
      const match = fileKey.replace('s3://', '').split('/');
      const bucket = match[0];
      const key = match.slice(1).join('/');

      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
        const data = await response.Body?.transformToByteArray();
        return Buffer.from(data || new Uint8Array());
      } catch (err) {
        this.logger.error(`S3 Download failed: ${err.message}`);
        throw err;
      }
    }

    // Local Disk read
    const localPath = path.isAbsolute(fileKey) 
      ? fileKey 
      : path.join(process.cwd(), fileKey);
      
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }
    return fs.promises.readFile(localPath);
  }

  async deleteFile(fileKey: string): Promise<void> {
    if (fileKey.startsWith('s3://') && this.s3Client) {
      const match = fileKey.replace('s3://', '').split('/');
      const bucket = match[0];
      const key = match.slice(1).join('/');

      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
        return;
      } catch (err) {
        this.logger.error(`S3 Delete failed: ${err.message}`);
      }
    }

    // Local Disk delete
    const localPath = path.isAbsolute(fileKey)
      ? fileKey
      : path.join(process.cwd(), fileKey);

    if (fs.existsSync(localPath)) {
      try {
        await fs.promises.unlink(localPath);
      } catch (err) {
        this.logger.error(`Failed to delete local file: ${err.message}`);
      }
    }
  }
}
