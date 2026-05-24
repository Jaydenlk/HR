export class CreateSalaryEntryDto {
  company: string;
  role: string;
  location?: string;
  base_salary: number;
  bonus?: number;
  stock_value?: number;
  total_comp: number;
  level?: string;
  source?: 'self' | 'peer';
}
