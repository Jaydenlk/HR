export interface ScoreColors {
  color: string;
  bg: string;
  label: string;
}

export function getScoreColor(score: number): ScoreColors {
  if (score >= 80) {
    return {
      color: 'var(--color-success)',
      bg: 'var(--color-success-soft)',
      label: '优',
    };
  }
  if (score >= 60) {
    return {
      color: 'var(--color-warn)',
      bg: 'var(--color-warn-soft)',
      label: '良',
    };
  }
  return {
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-soft)',
    label: '差',
  };
}
