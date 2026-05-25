import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { Repository } from 'typeorm';
import { FeedSource } from './entities/feed-source.entity';
import { FEED_SOURCE_KINDS, FEED_SOURCE_STATUSES } from './types/feed.types';
import type { FeedSourceKind, FeedSourceStatus } from './types/feed.types';

interface DigestSourceSeed {
  kind: FeedSourceKind;
  name: string;
  homepage_url: string | null;
  config_key: string | null;
  status: FeedSourceStatus;
  description: string | null;
}

@Injectable()
export class SourceRegistryService implements OnModuleInit {
  constructor(
    @InjectRepository(FeedSource)
    private readonly repo: Repository<FeedSource>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaults();
  }

  async ensureDefaults(): Promise<void> {
    const seeds = await this.readSeedFile();
    for (const seed of seeds) {
      const existing = await this.repo.findOne({
        where: { kind: seed.kind, name: seed.name },
      });
      const status = this.resolveStatus(seed);
      const entity = this.repo.create({
        ...(existing ?? {}),
        kind: seed.kind,
        name: seed.name,
        homepage_url: seed.homepage_url,
        config_key: seed.config_key,
        status,
        description: seed.description,
      });
      await this.repo.save(entity);
    }
  }

  findAll(): Promise<FeedSource[]> {
    return this.repo.find({ order: { kind: 'ASC', name: 'ASC' } });
  }

  findActive(): Promise<FeedSource[]> {
    return this.repo.find({
      where: { status: 'active' },
      order: { kind: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<FeedSource> {
    const source = await this.repo.findOne({ where: { id } });
    if (!source) throw new NotFoundException('Feed source not found');
    return source;
  }

  async markRun(sourceId: string): Promise<void> {
    await this.repo.update(sourceId, { last_run_at: new Date() });
  }

  private resolveStatus(seed: DigestSourceSeed): FeedSourceStatus {
    if (!seed.config_key) return seed.status;
    return process.env[seed.config_key] ? seed.status : 'needs_config';
  }

  private async readSeedFile(): Promise<DigestSourceSeed[]> {
    const raw = await fs.readFile(this.seedPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DigestSourceSeed => this.isSeed(item));
  }

  private seedPath(): string {
    const cwd = process.cwd();
    const candidates = [
      resolve(cwd, 'data', 'sources', 'digest_sources.json'),
      resolve(cwd, '..', '..', 'data', 'sources', 'digest_sources.json'),
      resolve(cwd, '..', '..', '..', 'data', 'sources', 'digest_sources.json'),
    ];
    return candidates.find((candidate) => existsSync(candidate)) ?? join(cwd, 'data', 'sources', 'digest_sources.json');
  }

  private isSeed(value: unknown): value is DigestSourceSeed {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return (
      typeof record.name === 'string' &&
      this.isSourceKind(record.kind) &&
      this.isSourceStatus(record.status) &&
      (record.homepage_url === null || typeof record.homepage_url === 'string') &&
      (record.config_key === null || typeof record.config_key === 'string') &&
      (record.description === null || typeof record.description === 'string')
    );
  }

  private isSourceKind(value: unknown): value is FeedSourceKind {
    return typeof value === 'string' && FEED_SOURCE_KINDS.some((kind) => kind === value);
  }

  private isSourceStatus(value: unknown): value is FeedSourceStatus {
    return typeof value === 'string' && FEED_SOURCE_STATUSES.some((status) => status === value);
  }
}
