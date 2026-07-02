import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ResumeVersion } from './resume-version.entity';
import { Diagnosis } from '../../diagnoses/entities/diagnosis.entity';
import type { ParsedResume } from '../../common/types';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, (u) => u.resumes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column('text')
  raw_text: string;

  @Column('simple-json', { nullable: true })
  parsed_json: ParsedResume | null;

  @Column({ nullable: true })
  file_type: string;

  @Column({ default: false })
  is_primary: boolean;

  @OneToMany(() => ResumeVersion, (v) => v.resume)
  versions: ResumeVersion[];

  @OneToMany(() => Diagnosis, (d) => d.resume)
  diagnoses: Diagnosis[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
