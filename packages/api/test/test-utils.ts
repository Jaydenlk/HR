import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
import { AppModule } from '../src/app.module';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const request: typeof supertest = (supertest as any).default ?? supertest;

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export async function loginUser(app: INestApplication, email = 'test@coach.dev', name = 'Test'): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, name, invite_code: 'COACH2026' });
  return res.body.access_token;
}
