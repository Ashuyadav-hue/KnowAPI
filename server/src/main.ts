import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: true, // Dynamically reflect request origin, fully compatible with credentials: true
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  await app.listen(port);
  
  logger.log(`KnowledgeAPI Backend is running on: http://localhost:${port}/api`);
}
bootstrap();
