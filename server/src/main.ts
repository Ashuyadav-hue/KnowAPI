import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

// Express instance to be used by Vercel
const expressApp = express();
let cachedHandler: any = null;

async function bootstrapServerless() {
  const logger = new Logger('ServerlessBootstrap');
  
  // Copy SQLite database to /tmp if running on Vercel
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/dev.db';
    const sourceDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    
    logger.log(`Serverless environment detected. Database paths - Source: ${sourceDbPath}, Target: ${tmpDbPath}`);
    
    // Set environment variable dynamically so Prisma client uses it
    process.env.DATABASE_URL = `file:${tmpDbPath}`;
    
    if (!fs.existsSync(tmpDbPath)) {
      try {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
          logger.log('Successfully copied SQLite dev.db to /tmp/dev.db');
        } else {
          logger.warn(`Source database file not found at ${sourceDbPath}. Database queries might fail.`);
        }
      } catch (err) {
        logger.error(`Failed to copy SQLite database to /tmp: ${err.message}`);
      }
    } else {
      logger.log('/tmp/dev.db already exists. Skipping copy.');
    }
  }

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();
  return expressApp;
}

// Handler for Vercel Serverless Function
export default async (req: any, res: any) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServerless();
  }
  return cachedHandler(req, res);
};

// Standalone bootstrap for local development (only run if not on Vercel)
if (!process.env.VERCEL) {
  async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
    await app.listen(port);
    logger.log(`KnowledgeAPI Backend is running on: http://localhost:${port}/api`);
  }
  bootstrap();
}

