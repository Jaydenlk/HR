import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversation_id: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column()
  role: string;

  @Column('text')
  content: string;

  @Column('simple-json', { nullable: true })
  rich_card: Record<string, unknown> | null;

  @Column({ nullable: true })
  tool_used: string;

  @CreateDateColumn()
  created_at: Date;
}
