import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TIMESTAMP_COLUMN_TYPE } from '../../database/column-types';

/**
 * interview_transcribe_tasks 表:面试录音转写任务的状态机。
 *
 * 采用独立任务表而非在 Interview 上堆状态字段:
 *  - 失败重跑不重转写:segments_json 非空时直接从 labeling 续跑;
 *  - 前端 3s 轮询进度需独立实体;
 *  - 保持 Interview 业务状态干净。
 *
 * 类型映射依据 TypeORM PostgresDriver(与 InitialSchema 头注一致):
 *  - @PrimaryGeneratedColumn('uuid') → uuid DEFAULT gen_random_uuid()
 *  - @Column({ type: 'uuid' }) → uuid NOT NULL
 *  - @Column({ type: 'varchar' }) → character varying NOT NULL
 *  - @Column({ type: 'varchar', nullable: true }) → character varying(可空)
 *  - @Column({ type: 'simple-json', nullable: true }) → text(TypeORM JSON.stringify 存取)
 *  - @Column({ type: 'text', nullable: true }) → text(可空)
 *  - @CreateDateColumn / @UpdateDateColumn → TIMESTAMP NOT NULL DEFAULT now()
 *
 * 索引:
 *  - IDX_transcribe_tasks_interview (interview_id):按面试查任务;
 *  - IDX_transcribe_tasks_user (user_id):按用户查任务。
 * 无显式 FK 约束(P0 简化;interview_id/user_id 由 service 层校验所有权)。
 */

/** 说话人角色枚举(打标输出、确认输入共用) */
export type SpeakerRole = 'interviewer' | 'candidate';

/**
 * LabeledSegment:带角色标的转写句段。
 *
 * B2(LabelService)会从 TranscriptSegment 扩展出此类型并导出;
 * B3 在 B2 未完成时在此做最小本地定义,S1 集成时若 B2 已导出则改为 import。
 */
export interface LabeledSegment {
  /** 原始段落序号(0-based,用于 confirm 端点按 idx 覆盖 speaker) */
  idx: number;
  /** 转写文本(confirm 路径只允许改 speaker,不允许改 text,防篡改) */
  text: string;
  /** 句段开始时间(毫秒,由 StepFun ASR 提供) */
  startMs: number;
  /** 句段结束时间(毫秒,由 StepFun ASR 提供) */
  endMs: number;
  /** LLM 打标或用户纠正后的说话人角色 */
  speaker: SpeakerRole;
}

/**
 * 任务状态流转:
 *
 *   submitted → transcribing → labeling → awaiting_confirm → analyzing → completed
 *                                                                ↘ failed(任一阶段异常)
 *
 * awaiting_confirm:标注完成后必须停在此等用户确认/纠正,不自动 analyze(锁定决策)。
 */
export type TranscribeStatus =
  | 'submitted'        // 任务建,音频已收,待提交 StepFun
  | 'transcribing'     // SSE 转写中
  | 'labeling'         // 拿到 utterances,LLM 打标中
  | 'awaiting_confirm' // 标注完成,等用户确认/纠正
  | 'analyzing'        // confirm 后喂 DebriefService.analyze 中
  | 'completed'        // analyze 结果写回 Interview,音频已弃
  | 'failed';          // 任一阶段异常

@Entity('interview_transcribe_tasks')
export class InterviewTranscribeTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联面试记录(service 层校验所有权;P0 不加数据库级 FK) */
  @Column({ type: 'uuid' })
  interview_id: string;

  /** 任务归属用户(鉴权所有权校验) */
  @Column({ type: 'uuid' })
  user_id: string;

  /** 当前状态,默认 submitted */
  @Column({ type: 'varchar', default: 'submitted' })
  status: TranscribeStatus;

  /** 记录在哪个阶段失败(仅 status=failed 时有值) */
  @Column({ type: 'varchar', nullable: true })
  failed_at_stage: string | null;

  /** 分析费(6 点)是否已扣:幂等护栏,confirm 分析成功后置 true,重试时据此不重扣。默认 false。 */
  @Column({ type: 'boolean', default: false })
  analysis_charged: boolean;

  /**
   * StepFun SSE 路线可空(base64 内联不产出 job_id);
   * 保留字段为 P1 文件识别路线或未来异步轮询方案预留。
   */
  @Column({ type: 'varchar', nullable: true })
  asr_job_id: string | null;

  /**
   * 带角色标的转写段落,存 LabeledSegment[] JSON。
   * 非空时重跑可跳过转写阶段直接续 labeling(重跑不重转写特性)。
   * TypeORM simple-json → text(JSON.stringify/parse)。
   */
  @Column({ type: 'simple-json', nullable: true })
  segments_json: LabeledSegment[] | null;

  /** 失败原因(仅 status=failed 时有值,不含敏感内部堆栈) */
  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  /**
   * 上传元数据(filename/size/mime/uploaded_at):仅供桌面端「已收到上传」回执展示。
   * 隐私铁律:这些是文件的元数据(原始文件名/字节数/MIME/上传时刻),不是音频内容本身;
   * audio Buffer 仍全程只在内存、interview.audio_url 仍恒为 null,转写后即 GC。可空(旧任务为 null)。
   */
  @Column({ type: 'varchar', nullable: true })
  original_filename: string | null;

  /** 上传文件字节数(humansize 展示)。25MB 上限远在 int4 内,双端均返回 number。可空。 */
  @Column({ type: 'int', nullable: true })
  file_size_bytes: number | null;

  /** 上传文件 MIME 类型。可空。 */
  @Column({ type: 'varchar', nullable: true })
  mime_type: string | null;

  /** 收到 multipart 文件那一刻(服务端 new Date());可空时间列用双端兼容类型。 */
  @Column({ type: TIMESTAMP_COLUMN_TYPE, nullable: true })
  uploaded_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
