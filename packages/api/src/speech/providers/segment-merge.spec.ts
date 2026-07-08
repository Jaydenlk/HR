/**
 * segment-merge 纯函数单测:字级/碎片片段 → 句级归并(provider 层 + 读取层共用)。
 *
 * fixture 形状照线上 psql 实读(task 4a8e0091):字级 LabeledSegment
 * {idx,text,startMs,endMs,speaker},连续语流 gap 0-80ms、句间大 gap、【无标点】。
 * 覆盖:speaker 变化切句 / 停顿切句 / 长度兜底 / idx 重编号 / 字级识别 / 句级不误并。
 */
import {
  mergeAdjacentSegments,
  looksCharLevel,
  MergeableSegment,
  PAUSE_GAP_MS,
} from './segment-merge';

interface LabeledLike {
  idx: number;
  text: string;
  startMs: number;
  endMs: number;
  speaker: 'interviewer' | 'candidate';
}

/** 把中文串按字铺成字级片段(连续 gap 小),模拟线上字级脏数据。 */
function charSegments(
  text: string,
  speaker: 'interviewer' | 'candidate',
  startAt: number,
): MergeableSegment[] {
  return text.split('').map((ch, i) => ({
    text: ch,
    // 连续语流:每字 80ms 间隔(远小于 PAUSE_GAP_MS),gap≈0-80ms。
    startMs: startAt + i * 80,
    endMs: startAt + i * 80 + 80,
    speaker,
  }));
}

/** 读取层的 build:带 speaker + idx 从 0 重编号(镜像 service 里的用法)。 */
function buildLabeled(
  m: { text: string; startMs: number; endMs: number; speaker?: string },
  index: number,
): LabeledLike {
  return {
    idx: index,
    text: m.text,
    startMs: m.startMs,
    endMs: m.endMs,
    speaker: m.speaker === 'interviewer' ? 'interviewer' : 'candidate',
  };
}

describe('looksCharLevel — 字级脏数据识别', () => {
  it('单字段流(平均字长 1)判为字级', () => {
    const segs = charSegments('然后这次意向的是新', 'candidate', 240);
    expect(looksCharLevel(segs)).toBe(true);
  });

  it('已是句级(平均字长远 > 2)判为非字级', () => {
    const segs: MergeableSegment[] = [
      { text: '你好，请自我介绍一下', startMs: 0, endMs: 2000, speaker: 'interviewer' },
      { text: '好的，我叫小明', startMs: 3500, endMs: 5000, speaker: 'candidate' },
    ];
    expect(looksCharLevel(segs)).toBe(false);
  });

  it('单段不判字级(无从判断,避免误伤)', () => {
    expect(looksCharLevel([{ text: '嗯', startMs: 0, endMs: 100 }])).toBe(false);
  });
});

describe('mergeAdjacentSegments — 读取层(带 speaker)字级归并', () => {
  it('同 speaker 连续字级流(gap 小)聚成一句,idx 从 0 重编号', () => {
    const raw = charSegments('然后这次意向的是新', 'candidate', 240);
    const merged = mergeAdjacentSegments<LabeledLike>(raw, buildLabeled);

    expect(merged).toHaveLength(1);
    expect(merged[0].idx).toBe(0);
    expect(merged[0].text).toBe('然后这次意向的是新');
    expect(merged[0].speaker).toBe('candidate');
    expect(merged[0].startMs).toBe(240); // 首字 start = 240
    expect(merged[0].endMs).toBe(960); // 末字(第9字 i=8)end = 240 + 8*80 + 80 = 960
    for (const s of merged) expect(s.endMs).toBeGreaterThanOrEqual(s.startMs);
  });

  it('speaker 变化必切句(即使无停顿、时间连续)', () => {
    // 面试官「你好吗」紧接候选人「挺好」,时间连续(gap 小),仅靠 speaker 变化切句。
    const q = charSegments('你好吗', 'interviewer', 0);
    const lastEnd = q[q.length - 1].endMs;
    const a = charSegments('挺好', 'candidate', lastEnd); // 紧接,gap≈0
    const merged = mergeAdjacentSegments<LabeledLike>([...q, ...a], buildLabeled);

    expect(merged).toHaveLength(2);
    expect(merged[0].text).toBe('你好吗');
    expect(merged[0].speaker).toBe('interviewer');
    expect(merged[0].idx).toBe(0);
    expect(merged[1].text).toBe('挺好');
    expect(merged[1].speaker).toBe('candidate');
    expect(merged[1].idx).toBe(1);
  });

  it('同 speaker 但句间大停顿(gap ≥ 阈值)也切句', () => {
    const s1 = charSegments('自我介绍', 'candidate', 0);
    const s1End = s1[s1.length - 1].endMs;
    // 第二句同为候选人,但停顿 PAUSE_GAP_MS + 200ms → 切句。
    const s2 = charSegments('我叫小明', 'candidate', s1End + PAUSE_GAP_MS + 200);
    const merged = mergeAdjacentSegments<LabeledLike>([...s1, ...s2], buildLabeled);

    expect(merged).toHaveLength(2);
    expect(merged[0].text).toBe('自我介绍');
    expect(merged[1].text).toBe('我叫小明');
  });

  it('多轮问答字级流:按 speaker 交替聚成对应句数,idx 连续', () => {
    // 面试官提问 → 候选人作答 → 面试官追问,三段各自成句。
    const t0 = charSegments('讲讲你的项目', 'interviewer', 0);
    const t1s = t0[t0.length - 1].endMs;
    const t1 = charSegments('我做了一个电商系统', 'candidate', t1s);
    const t2s = t1[t1.length - 1].endMs;
    const t2 = charSegments('遇到什么难点', 'interviewer', t2s);

    const merged = mergeAdjacentSegments<LabeledLike>([...t0, ...t1, ...t2], buildLabeled);
    expect(merged.map((m) => m.text)).toEqual([
      '讲讲你的项目',
      '我做了一个电商系统',
      '遇到什么难点',
    ]);
    expect(merged.map((m) => m.speaker)).toEqual(['interviewer', 'candidate', 'interviewer']);
    expect(merged.map((m) => m.idx)).toEqual([0, 1, 2]);
  });

  it('长度兜底:同 speaker 无停顿超长流达 MAX_SENTENCE_CHARS 强制断句', () => {
    // 单人无停顿念 300 字(连续 gap 小、无标点):不能聚成单句无限长,长度上限兜底切开。
    const longText = '词'.repeat(300);
    const raw = charSegments(longText, 'candidate', 0);
    const merged = mergeAdjacentSegments<LabeledLike>(raw, buildLabeled);

    expect(merged.length).toBeGreaterThan(1);
    // 每句长度不超过上限（120）+ 1（累积到 >=120 时下一字才触发切,故最多 120 字左右）。
    for (const s of merged) {
      expect(s.text.length).toBeLessThanOrEqual(121);
    }
  });
});
