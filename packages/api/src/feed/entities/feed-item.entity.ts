import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('feed_items')
export class FeedItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  outcome: string;

  /** ugc | github | nowcoder | ai_digest */
  @Column({ default: 'ugc' })
  source: string;

  /** interview_exp | editorial | hot | story */
  @Column({ default: 'interview_exp' })
  category: string;

  @Column({ nullable: true, length: 1000 })
  source_url: string;

  @Column({ nullable: true })
  author: string;

  @CreateDateColumn()
  created_at: Date;
}
