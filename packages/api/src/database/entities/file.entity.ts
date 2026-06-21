import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * file_metadata 表:为每个上传对象 key 记录归属用户,落地对象级 ACL。
 *
 * 背景(IDOR 修复):FilesService.upload 此前只把文件写到 /uploads/<folder>/<uuid>.<ext> 并返回 key,
 * key 与用户没有任何绑定。任何携带有效 JWT 的攻击者都可枚举/猜测 uuid,
 * 一旦存在下载端点即可越权拉取他人简历/头像。本表把「key → user_id」固化为可校验的归属关系,
 * 下载端点据此 assertOwner,非属主一律 404(不泄露存在性,对齐 findOne(id,userId) 现行模式)。
 *
 * key 唯一:同一对象 key 全局唯一(uuid 文件名),作为 ACL 校验主键路径。
 * FK user_id → users.id CASCADE:用户注销后元数据随之清理。
 */
@Entity('file_metadata')
export class FileMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  key: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  folder: string;

  @CreateDateColumn()
  created_at: Date;
}
