'use client';

import type { ParsedResume } from '@/lib/types';
import { User, Briefcase, GraduationCap, Wrench, FolderGit2 } from 'lucide-react';

interface ResumePreviewProps {
  parsed: ParsedResume;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <span style={{ color: 'var(--color-ink-3)', display: 'flex', alignItems: 'center' }}>{icon}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '3px 10px',
        borderRadius: '6px',
        background: 'var(--color-surface-2)',
        color: 'var(--color-ink-2)',
        fontSize: '12px',
        fontWeight: 500,
        border: '1px solid var(--color-line)',
      }}
    >
      {text}
    </span>
  );
}

export function ResumePreview({ parsed }: ResumePreviewProps) {
  const { basic_info, summary, work_experience, education, skills, projects } = parsed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Basic info */}
      <Section icon={<User size={14} />} title="基本信息">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
          {basic_info.name && (
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500 }}>姓名</span>
              <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 600, marginTop: '2px' }}>{basic_info.name}</div>
            </div>
          )}
          {basic_info.email && (
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500 }}>邮箱</span>
              <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', marginTop: '2px' }}>{basic_info.email}</div>
            </div>
          )}
          {basic_info.phone && (
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500 }}>电话</span>
              <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', marginTop: '2px' }}>{basic_info.phone}</div>
            </div>
          )}
          {basic_info.location && (
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500 }}>地点</span>
              <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', marginTop: '2px' }}>{basic_info.location}</div>
            </div>
          )}
        </div>
        {summary && (
          <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.65, marginTop: '12px', fontStyle: 'italic' }}>
            {summary}
          </p>
        )}
      </Section>

      {/* Work experience */}
      {work_experience?.length > 0 && (
        <Section icon={<Briefcase size={14} />} title="工作经历">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {work_experience.map((exp, i) => (
              <div key={i} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--color-line-2)' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
                  {exp.title}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-brand-ink)', marginTop: '2px', fontWeight: 500 }}>
                  {exp.company}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                  {exp.start_date}{exp.end_date ? ` — ${exp.end_date}` : ' — 至今'}
                </div>
                {exp.description && (
                  <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.65, marginTop: '8px' }}>
                    {exp.description}
                  </p>
                )}
                {exp.achievements?.length > 0 && (
                  <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {exp.achievements.map((a, j) => (
                      <li key={j} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {education?.length > 0 && (
        <Section icon={<GraduationCap size={14} />} title="教育背景">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {education.map((edu, i) => (
              <div key={i} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--color-line-2)' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>{edu.school}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', marginTop: '2px' }}>
                  {edu.degree}{edu.major ? ` · ${edu.major}` : ''}
                </div>
                {edu.graduation_date && (
                  <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                    {edu.graduation_date}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {skills && (
        <Section icon={<Wrench size={14} />} title="技能">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {skills.technical?.length > 0 && (
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500, marginBottom: '6px' }}>技术技能</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {skills.technical.map((s, i) => <Tag key={i} text={s} />)}
                </div>
              </div>
            )}
            {skills.soft?.length > 0 && (
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500, marginBottom: '6px' }}>软技能</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {skills.soft.map((s, i) => <Tag key={i} text={s} />)}
                </div>
              </div>
            )}
            {skills.languages?.length > 0 && (
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500, marginBottom: '6px' }}>语言</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {skills.languages.map((s, i) => <Tag key={i} text={s} />)}
                </div>
              </div>
            )}
            {skills.certifications?.length > 0 && (
              <div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', fontWeight: 500, marginBottom: '6px' }}>证书</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {skills.certifications.map((s, i) => <Tag key={i} text={s} />)}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects?.length > 0 && (
        <Section icon={<FolderGit2 size={14} />} title="项目">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {projects.map((proj, i) => (
              <div key={i} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--color-line-2)' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>{proj.name}</div>
                {proj.role && (
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>{proj.role}</div>
                )}
                {proj.description && (
                  <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.65, marginTop: '6px' }}>
                    {proj.description}
                  </p>
                )}
                {proj.technologies?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                    {proj.technologies.map((t, j) => <Tag key={j} text={t} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
