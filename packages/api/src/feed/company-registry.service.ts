import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { RoleCategory } from './entities/role-category.entity';
import { COMPANY_TYPES, COMPANY_PRIORITIES, REASON_TYPES } from './types/newspaper.types';
import type { CompanyType, CompanyPriority, ReasonType } from './types/newspaper.types';

interface CompanySeed {
  name: string;
  aliases: string[];
  bu_aliases: string[];
  company_type: CompanyType;
  priority: CompanyPriority;
  source_preference: string;
  role_focus: string[];
  sector: string | null;
  reason_type: ReasonType;
  reason: string | null;
}

interface RoleCategorySeed {
  role_key: string;
  label: string;
  aliases: string[];
  source_preference: string;
  question_taxonomy: string[];
}

@Injectable()
export class CompanyRegistryService implements OnModuleInit {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(RoleCategory)
    private readonly roleCategoryRepo: Repository<RoleCategory>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedCompanies();
    await this.seedRoleCategories();
  }

  async matchCompany(name: string): Promise<Company | null> {
    const normalized = name.trim().toLowerCase();
    const all = await this.companyRepo.find();
    return (
      all.find((company) => {
        if (company.name.toLowerCase() === normalized) return true;
        return company.aliases.some((alias) => alias.trim().toLowerCase() === normalized);
      }) ?? null
    );
  }

  async matchRoleCategory(role: string): Promise<RoleCategory | null> {
    const normalized = role.trim().toLowerCase();
    const all = await this.roleCategoryRepo.find();
    return (
      all.find((rc) => {
        if (rc.label.toLowerCase() === normalized) return true;
        if (rc.role_key.toLowerCase() === normalized) return true;
        return rc.aliases.some((alias) => alias.trim().toLowerCase() === normalized);
      }) ?? null
    );
  }

  findAll(): Promise<Company[]> {
    return this.companyRepo.find({ order: { priority: 'ASC', name: 'ASC' } });
  }

  findAllRoleCategories(): Promise<RoleCategory[]> {
    return this.roleCategoryRepo.find({ order: { role_key: 'ASC' } });
  }

  findByPriority(priority: 'A' | 'B' | 'C'): Promise<Company[]> {
    return this.companyRepo.find({
      where: { priority },
      order: { name: 'ASC' },
    });
  }

  private async seedCompanies(): Promise<void> {
    const seeds = await this.readCompanySeedFile();
    for (const seed of seeds) {
      const existing = await this.companyRepo.findOne({ where: { name: seed.name } });
      const entity = this.companyRepo.create({
        ...(existing ?? {}),
        name: seed.name,
        aliases: seed.aliases,
        bu_aliases: seed.bu_aliases,
        company_type: seed.company_type,
        priority: seed.priority,
        source_preference: seed.source_preference,
        role_focus: seed.role_focus,
        sector: seed.sector ?? undefined,
        reason_type: seed.reason_type,
        reason: seed.reason ?? undefined,
      });
      await this.companyRepo.save(entity);
    }
  }

  private async seedRoleCategories(): Promise<void> {
    const seeds = await this.readRoleCategorySeedFile();
    for (const seed of seeds) {
      const existing = await this.roleCategoryRepo.findOne({ where: { role_key: seed.role_key } });
      const entity = this.roleCategoryRepo.create({
        ...(existing ?? {}),
        role_key: seed.role_key,
        label: seed.label,
        aliases: seed.aliases,
        source_preference: seed.source_preference,
        question_taxonomy: seed.question_taxonomy,
      });
      await this.roleCategoryRepo.save(entity);
    }
  }

  private async readCompanySeedFile(): Promise<CompanySeed[]> {
    const raw = await fs.readFile(this.companySeedPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CompanySeed => this.isCompanySeed(item));
  }

  private async readRoleCategorySeedFile(): Promise<RoleCategorySeed[]> {
    const raw = await fs.readFile(this.roleCategorySeedPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RoleCategorySeed => this.isRoleCategorySeed(item));
  }

  private companySeedPath(): string {
    const cwd = process.cwd();
    const candidates = [
      resolve(cwd, 'data', 'sources', 'company_seed.json'),
      resolve(cwd, '..', '..', 'data', 'sources', 'company_seed.json'),
      resolve(cwd, '..', '..', '..', 'data', 'sources', 'company_seed.json'),
    ];
    return candidates.find((c) => existsSync(c)) ?? resolve(cwd, 'data', 'sources', 'company_seed.json');
  }

  private roleCategorySeedPath(): string {
    const cwd = process.cwd();
    const candidates = [
      resolve(cwd, 'data', 'sources', 'role_categories.json'),
      resolve(cwd, '..', '..', 'data', 'sources', 'role_categories.json'),
      resolve(cwd, '..', '..', '..', 'data', 'sources', 'role_categories.json'),
    ];
    return candidates.find((c) => existsSync(c)) ?? resolve(cwd, 'data', 'sources', 'role_categories.json');
  }

  private isCompanySeed(value: unknown): value is CompanySeed {
    if (!value || typeof value !== 'object') return false;
    const r = value as Record<string, unknown>;
    return (
      typeof r.name === 'string' &&
      Array.isArray(r.aliases) &&
      Array.isArray(r.bu_aliases) &&
      COMPANY_TYPES.some((t) => t === r.company_type) &&
      COMPANY_PRIORITIES.some((p) => p === r.priority) &&
      typeof r.source_preference === 'string' &&
      Array.isArray(r.role_focus) &&
      REASON_TYPES.some((rt) => rt === r.reason_type)
    );
  }

  private isRoleCategorySeed(value: unknown): value is RoleCategorySeed {
    if (!value || typeof value !== 'object') return false;
    const r = value as Record<string, unknown>;
    return (
      typeof r.role_key === 'string' &&
      typeof r.label === 'string' &&
      Array.isArray(r.aliases) &&
      typeof r.source_preference === 'string' &&
      Array.isArray(r.question_taxonomy)
    );
  }
}
