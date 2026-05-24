import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryEntry } from './entities/salary-entry.entity';
import { CreateSalaryEntryDto } from './dto/create-salary-entry.dto';

export interface SalaryStats {
  company: string;
  role: string;
  avg_base: number;
  avg_total: number;
  count: number;
}

export interface SalaryFilters {
  company?: string;
  role?: string;
  location?: string;
}

@Injectable()
export class SalaryService {
  constructor(
    @InjectRepository(SalaryEntry)
    private readonly repo: Repository<SalaryEntry>,
  ) {}

  create(userId: string, dto: CreateSalaryEntryDto): Promise<SalaryEntry> {
    return this.repo.save(
      this.repo.create({
        user_id: userId,
        company: dto.company,
        role: dto.role,
        location: dto.location ?? undefined,
        base_salary: dto.base_salary,
        bonus: dto.bonus ?? undefined,
        stock_value: dto.stock_value ?? undefined,
        total_comp: dto.total_comp,
        level: dto.level ?? undefined,
        source: dto.source ?? 'self',
      }),
    );
  }

  findAll(filters?: SalaryFilters): Promise<SalaryEntry[]> {
    const where: Partial<SalaryEntry> = {};
    if (filters?.company) where.company = filters.company;
    if (filters?.role) where.role = filters.role;
    if (filters?.location) where.location = filters.location;

    return this.repo.find({
      where: Object.keys(where).length ? where : undefined,
      order: { created_at: 'DESC' },
    });
  }

  findAllByUser(userId: string): Promise<SalaryEntry[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async getStats(): Promise<SalaryStats[]> {
    const rows = await this.repo
      .createQueryBuilder('s')
      .select('s.company', 'company')
      .addSelect('s.role', 'role')
      .addSelect('AVG(s.base_salary)', 'avg_base')
      .addSelect('AVG(s.total_comp)', 'avg_total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.company')
      .addGroupBy('s.role')
      .orderBy('count', 'DESC')
      .getRawMany<{ company: string; role: string; avg_base: string; avg_total: string; count: string }>();

    return rows.map((r) => ({
      company: r.company,
      role: r.role,
      avg_base: Math.round(parseFloat(r.avg_base)),
      avg_total: Math.round(parseFloat(r.avg_total)),
      count: parseInt(r.count, 10),
    }));
  }

  async findOne(id: string, userId: string): Promise<SalaryEntry> {
    const entry = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!entry) throw new NotFoundException();
    return entry;
  }

  async remove(id: string, userId: string): Promise<void> {
    const entry = await this.findOne(id, userId);
    await this.repo.remove(entry);
  }
}
