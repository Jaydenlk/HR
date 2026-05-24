export class CreateCoverLetterDto {
  resume_id?: string;
  application_id?: string;
  company: string;
  role: string;
  tone?: 'professional' | 'warm' | 'direct';
  length_words?: number;
  jd_text?: string;
}
