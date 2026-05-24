import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resume } from './resume.entity';
import type { ParsedResume } from '../../common/types';

@Entity('resume_versions')
export class ResumeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resume_id: string;

  @ManyToOne(() => Resume, (r) => r.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume: Resume;

  @Column()
  version_num: number;

  @Column('text')
  raw_text: string;

  @Column('simple-json', { nullable: true })
  parsed_json: ParsedResume | null;

  @Column({ nullable: true })
  change_note: string;

  @CreateDateColumn()
  created_at: Date;
}
