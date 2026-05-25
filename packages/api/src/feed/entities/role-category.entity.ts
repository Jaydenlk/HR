import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('role_categories')
export class RoleCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  role_key: string;

  @Column()
  label: string;

  @Column({ type: 'simple-json', default: '[]' })
  aliases: string[];

  @Column({ type: 'varchar', default: 'both' })
  source_preference: string;

  @Column({ type: 'simple-json', default: '[]' })
  question_taxonomy: string[];

  @CreateDateColumn()
  created_at: Date;
}
