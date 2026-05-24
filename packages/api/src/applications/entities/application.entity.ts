import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApplicationEvent } from './application-event.entity';

export type ApplicationStage = 'wishlist' | 'applied' | 'interview' | 'final' | 'offer' | 'rejected';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  company: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'varchar', default: 'wishlist' })
  stage: ApplicationStage;

  @Column({ nullable: true })
  salary_range: string;

  @Column({ nullable: true })
  deadline: string;

  @Column({ nullable: true })
  referrer: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ nullable: true })
  resume_id: string;

  @Column({ nullable: true })
  diagnosis_id: string;

  @OneToMany(() => ApplicationEvent, (e) => e.application, { cascade: true })
  events: ApplicationEvent[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
