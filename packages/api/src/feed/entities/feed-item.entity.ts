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

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
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

  @CreateDateColumn()
  created_at: Date;
}
