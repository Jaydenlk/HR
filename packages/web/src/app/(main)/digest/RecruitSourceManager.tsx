'use client';

import { AlertCircle, CheckCircle2, Link2, Loader2, Plus } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { FeedSource, RecruitIntelSourceKind, RecruitUploadResult } from '@/lib/types';

const RECRUIT_KIND_LABELS: Record<RecruitIntelSourceKind, string> = {
  sheet_file: 'Excel/CSV 文件',
  sheet_link: '在线表格链接',
  wechat_dump: '公众号整理稿',
};

const RECRUIT_KIND_HINTS: Record<RecruitIntelSourceKind, string> = {
  sheet_file: '上传后立即解析入库。',
  sheet_link: '腾讯文档/飞书链接，周一凌晨尽力抓取；抓不到会在来源状态区提示改用文件上传。',
  wechat_dump: '上传人工整理/半自动脚本产出的 json（结构见交付说明），上传后立即解析入库。',
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

interface CreateFormState {
  kind: RecruitIntelSourceKind;
  name: string;
  homepage_url: string;
}

const EMPTY_CREATE_FORM: CreateFormState = { kind: 'sheet_file', name: '', homepage_url: '' };

export function RecruitSourceManager({
  sources,
  onChanged,
}: {
  sources: FeedSource[];
  onChanged: () => void;
}) {
  const recruitSources = sources.filter(
    (s): s is FeedSource & { kind: RecruitIntelSourceKind } =>
      s.kind === 'sheet_file' || s.kind === 'sheet_link' || s.kind === 'wechat_dump',
  );

  const [form, setForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.post('/feed/sources', {
        kind: form.kind,
        name: form.name.trim(),
        ...(form.kind === 'sheet_link' && form.homepage_url.trim()
          ? { homepage_url: form.homepage_url.trim() }
          : {}),
      });
      setForm(EMPTY_CREATE_FORM);
      onChanged();
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="lg recruit-manager">
      <style>{RECRUIT_MANAGER_CSS}</style>
      <h3>校招情报源（管理员）</h3>
      <p className="recruit-manager-hint">
        Excel/CSV 上传、在线表格链接（尽力抓取，抓不到请导出 CSV 改用文件上传）、公众号整理稿三类源，解析产出落入
        /newspaper「校招情报」板块。
      </p>

      {recruitSources.length > 0 && (
        <ul className="recruit-source-list">
          {recruitSources.map((source) => (
            <RecruitSourceRow key={source.id} source={source} onChanged={onChanged} />
          ))}
        </ul>
      )}

      <form className="recruit-create-form" onSubmit={(e) => void handleCreate(e)}>
        <select
          value={form.kind}
          onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as RecruitIntelSourceKind }))}
        >
          {(Object.keys(RECRUIT_KIND_LABELS) as RecruitIntelSourceKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {RECRUIT_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="来源名称，如：2027届校招信息表"
          maxLength={100}
        />
        {form.kind === 'sheet_link' && (
          <input
            value={form.homepage_url}
            onChange={(e) => setForm((f) => ({ ...f, homepage_url: e.target.value }))}
            placeholder="腾讯文档/飞书链接"
            maxLength={1000}
          />
        )}
        <button className="secondary-button" type="submit" disabled={creating || !form.name.trim()}>
          {creating ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
          新增来源
        </button>
      </form>
      {createError && (
        <p className="recruit-form-error">
          <AlertCircle size={13} />
          {createError}
        </p>
      )}
    </section>
  );
}

function RecruitSourceRow({
  source,
  onChanged,
}: {
  source: FeedSource & { kind: RecruitIntelSourceKind };
  onChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<RecruitUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUpload = source.kind === 'sheet_file' || source.kind === 'wechat_dump';

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const uploaded = await api.upload<RecruitUploadResult>(`/feed/sources/${source.id}/upload`, file);
      setResult(uploaded);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <li className="recruit-source-row">
      <div className="recruit-source-main">
        <strong>{source.name}</strong>
        <span className="recruit-source-kind">{RECRUIT_KIND_LABELS[source.kind]}</span>
      </div>
      <p className="recruit-source-hint">{RECRUIT_KIND_HINTS[source.kind]}</p>
      {source.kind === 'sheet_link' && source.homepage_url && (
        <a className="recruit-source-link" href={source.homepage_url} target="_blank" rel="noopener noreferrer">
          <Link2 size={12} />
          {source.homepage_url}
        </a>
      )}
      {canUpload && (
        <div className="recruit-source-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept={source.kind === 'sheet_file' ? '.csv,.xlsx,.xls' : '.json'}
            onChange={(e) => void handleFileChange(e)}
            disabled={uploading}
          />
          {uploading && <Loader2 className="spin" size={14} />}
        </div>
      )}
      {result && (
        <p className="recruit-source-result">
          <CheckCircle2 size={13} />
          {`解析 ${result.total_rows} 行，入库/合并 ${result.saved} 条，跳过 ${result.skipped} 条`}
        </p>
      )}
      {error && (
        <p className="recruit-form-error">
          <AlertCircle size={13} />
          {error}
        </p>
      )}
    </li>
  );
}

const RECRUIT_MANAGER_CSS = `
.recruit-manager {
  padding: 16px;
  margin-bottom: 12px;
}

.recruit-manager h3 {
  margin: 0 0 6px;
  font-family: var(--serif);
  font-size: 15px;
}

.recruit-manager-hint {
  margin: 0 0 12px;
  color: var(--color-ink-3);
  font-size: 12.5px;
  line-height: 1.6;
}

.recruit-source-list {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recruit-source-row {
  border: 1px solid var(--hair);
  border-radius: var(--radius-default);
  padding: 10px 12px;
  background: rgba(47,143,255,.05);
}

.recruit-source-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recruit-source-main strong {
  font-size: 13px;
}

.recruit-source-kind {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-brand-ink);
  background: var(--color-brand-soft);
  border-radius: 999px;
  padding: 2px 8px;
}

.recruit-source-hint {
  margin: 4px 0;
  color: var(--color-ink-3);
  font-size: 12px;
  line-height: 1.5;
}

.recruit-source-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-brand);
  font-size: 12px;
  word-break: break-all;
}

.recruit-source-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.recruit-source-upload input[type='file'] {
  font-size: 12px;
  color: var(--color-ink-3);
}

.recruit-source-result {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 0;
  color: var(--color-success);
  font-size: 12px;
}

.recruit-form-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  color: var(--color-danger);
  font-size: 12.5px;
}

.recruit-create-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.recruit-create-form select,
.recruit-create-form input {
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-ink);
  font: inherit;
  font-size: 12.5px;
  padding: 7px 10px;
  min-width: 160px;
}
`;
