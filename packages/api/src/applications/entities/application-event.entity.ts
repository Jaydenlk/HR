import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity';
import type { ApplicationStage } from './application.entity';

@Entity('application_events')
export class ApplicationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  application_id: string;

  @ManyToOne(() => Application, (a) => a.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ nullable: true })
  from_stage: ApplicationStage | null;

  @Column()
  to_stage: ApplicationStage;

  @Column('text', { nullable: true })
  note: string;

  @CreateDateColumn()
  created_at: Date;
}
