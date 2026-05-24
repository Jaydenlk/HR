import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity';
@Entity('application_events')
export class ApplicationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  application_id: string;

  @ManyToOne(() => Application, (a) => a.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ type: 'varchar', nullable: true })
  from_stage: string | null;

  @Column({ type: 'varchar' })
  to_stage: string;

  @Column('text', { nullable: true })
  note: string;

  @CreateDateColumn()
  created_at: Date;
}
