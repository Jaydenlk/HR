import { Application } from '../entities/application.entity';
import { ApplicationEvent } from '../entities/application-event.entity';

export class ApplicationEventResponseDto {
  id: string;
  application_id: string;
  from_stage: string | null;
  to_stage: string;
  note: string | null;
  created_at: Date;

  static from(event: ApplicationEvent): ApplicationEventResponseDto {
    const dto = new ApplicationEventResponseDto();
    dto.id = event.id;
    dto.application_id = event.application_id;
    dto.from_stage = event.from_stage ?? null;
    dto.to_stage = event.to_stage;
    dto.note = event.note ?? null;
    dto.created_at = event.created_at;
    return dto;
  }
}

export class ApplicationResponseDto {
  id: string;
  company: string;
  role: string;
  location: string | null;
  stage: Application['stage'];
  salary_range: string | null;
  deadline: string | null;
  referrer: string | null;
  notes: string | null;
  resume_id: string | null;
  diagnosis_id: string | null;
  events?: ApplicationEventResponseDto[];
  created_at: Date;
  updated_at: Date;

  static from(application: Application): ApplicationResponseDto {
    const dto = new ApplicationResponseDto();
    dto.id = application.id;
    dto.company = application.company;
    dto.role = application.role;
    dto.location = application.location ?? null;
    dto.stage = application.stage;
    dto.salary_range = application.salary_range ?? null;
    dto.deadline = application.deadline ?? null;
    dto.referrer = application.referrer ?? null;
    dto.notes = application.notes ?? null;
    dto.resume_id = application.resume_id ?? null;
    dto.diagnosis_id = application.diagnosis_id ?? null;
    if (application.events !== undefined) {
      dto.events = application.events.map(ApplicationEventResponseDto.from);
    }
    dto.created_at = application.created_at;
    dto.updated_at = application.updated_at;
    return dto;
  }
}
