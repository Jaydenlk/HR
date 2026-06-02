import { SalaryEntry } from '../entities/salary-entry.entity';

/**
 * Anonymized salary record returned to clients. The salary pool is an
 * intentionally cross-user shared dataset (the product's selling point), so
 * every record here is stripped of identifying fields — `user_id`/`user` never
 * leave the API.
 */
export class SalaryEntryResponseDto {
  id: string;
  company: string;
  role: string;
  location: string | null;
  base_salary: number;
  bonus: number | null;
  stock_value: number | null;
  total_comp: number;
  level: string | null;
  source: SalaryEntry['source'];
  created_at: Date;

  static from(entry: SalaryEntry): SalaryEntryResponseDto {
    const dto = new SalaryEntryResponseDto();
    dto.id = entry.id;
    dto.company = entry.company;
    dto.role = entry.role;
    dto.location = entry.location ?? null;
    dto.base_salary = entry.base_salary;
    dto.bonus = entry.bonus ?? null;
    dto.stock_value = entry.stock_value ?? null;
    dto.total_comp = entry.total_comp;
    dto.level = entry.level ?? null;
    dto.source = entry.source;
    dto.created_at = entry.created_at;
    return dto;
  }
}
