import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

type JobHandler = (data: any) => Promise<void>;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private handlers = new Map<string, JobHandler>();
  
  // BullMQ instances
  private bullQueue: Queue | null = null;
  private bullWorker: Worker | null = null;
  private redisConnection: Redis | null = null;

  // Local Mode state
  private isLocalMode = true;
  private localJobQueue: Array<{ jobType: string; data: any }> = [];
  private localProcessing = false;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.logger.log(`Redis URL found. Attempting BullMQ Production Mode.`);
      try {
        this.redisConnection = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
        });
        
        this.bullQueue = new Queue('knowledge-pipeline', {
          connection: this.redisConnection as any,
        });
        this.isLocalMode = false;
      } catch (err) {
        this.logger.error(`Failed to connect to Redis: ${err.message}. Falling back to Local Queue.`);
        this.isLocalMode = true;
      }
    } else {
      this.logger.log('Redis URL not specified. Using Local In-Memory Queue.');
    }
  }

  async onModuleInit() {
    if (!this.isLocalMode && this.redisConnection) {
      this.logger.log('Starting BullMQ Production Worker.');
      this.bullWorker = new Worker(
        'knowledge-pipeline',
        async (job: Job) => {
          const handler = this.handlers.get(job.name);
          if (handler) {
            this.logger.log(`Processing production job ${job.name} (ID: ${job.id})`);
            await handler(job.data);
          } else {
            this.logger.warn(`No handler registered for job type: ${job.name}`);
          }
        },
        { connection: this.redisConnection as any }
      );

      this.bullWorker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.name} failed: ${err.message}`);
      });
    }
  }

  async onModuleDestroy() {
    if (this.bullQueue) {
      await this.bullQueue.close();
    }
    if (this.bullWorker) {
      await this.bullWorker.close();
    }
    if (this.redisConnection) {
      this.redisConnection.disconnect();
    }
  }

  registerHandler(jobType: string, handler: JobHandler) {
    this.handlers.set(jobType, handler);
    this.logger.log(`Registered handler for job type: ${jobType}`);
  }

  async addJob(jobType: string, data: any): Promise<void> {
    if (!this.isLocalMode && this.bullQueue) {
      this.logger.log(`Queueing production job: ${jobType}`);
      await this.bullQueue.add(jobType, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      return;
    }

    // Local In-Memory execution
    this.logger.log(`Queueing local in-memory job: ${jobType}`);
    this.localJobQueue.push({ jobType, data });
    
    // Trigger local queue worker loop asynchronously
    setImmediate(() => this.processLocalQueue());
  }

  private async processLocalQueue() {
    if (this.localProcessing || this.localJobQueue.length === 0) return;
    this.localProcessing = true;

    while (this.localJobQueue.length > 0) {
      const job = this.localJobQueue.shift();
      if (!job) continue;

      const handler = this.handlers.get(job.jobType);
      if (handler) {
        try {
          this.logger.log(`Processing local job: ${job.jobType}`);
          await handler(job.data);
          this.logger.log(`Finished local job: ${job.jobType}`);
        } catch (err) {
          this.logger.error(`Error in local job ${job.jobType}: ${err.message}`);
        }
      } else {
        this.logger.warn(`No handler registered for local job type: ${job.jobType}`);
      }
    }

    this.localProcessing = false;
  }
}
