import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type HandoffTarget = 'mock' | 'diagnosis' | 'cover_letter' | 'resume_rewrite';
export type HandoffStatus = 'proposed' | 'accepted' | 'dismissed' | 'completed';

@Entity('coach_handoffs')
export class CoachHandoff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({ type: 'uuid', nullable: true })
  message_id: string | null;

  @Column()
  target: HandoffTarget;

  @Column('simple-json', { nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ default: 'proposed' })
  status: HandoffStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
