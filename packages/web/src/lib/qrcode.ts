// 纯前端 QR 码生成器(无第三方依赖)。
//
// 为什么自带而非引库:扫码上传只需把一条 ~70–120 字符的 URL 编成二维码,渲染成 SVG 即可。
// 引入 qrcode/qrcode.react 会带进 canvas/编码全家桶(数十 KB)与额外 React 适配层,违反
// 「别引重依赖」。这里实现 QR Model 2、字节模式(UTF-8)、纠错等级 M,自动选最小可容纳的版本,
// 输出布尔矩阵交给组件渲染 SVG。算法依据 ISO/IEC 18004(Reed–Solomon + GF(256) + 掩码评分)。
//
// 仅覆盖本场景所需:字节模式、纠错 M、版本 1–10(可容纳 URL 远超所需)。不支持数字/字母数字
// 模式与更高版本——刻意做减法,不堆没人用的「灵活性」。

// ── GF(256) 伽罗瓦域:Reed–Solomon 纠错的算术基础(本原多项式 0x11d)──────────────
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

// 生成 degree 次的 Reed–Solomon 生成多项式(系数从高到低)。
function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], GF_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

// 对数据码字做多项式除法,取余数即纠错码字。
function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Array<number>(ecLen).fill(0);
  for (const d of data) {
    const factor = d ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) {
      for (let i = 0; i < gen.length; i++) {
        res[i] ^= gfMul(gen[i + 1] ?? 0, factor);
      }
    }
  }
  return res;
}

// ── 版本容量表(纠错等级 M):每版本的 [总码字, 每块纠错码字, 组1块数, 组1每块数据码字,
//    组2块数, 组2每块数据码字]。版本 1–10 足以容纳数百字符的 URL。──────────────────────
interface VersionSpec {
  version: number;
  totalCodewords: number;
  ecPerBlock: number;
  g1Blocks: number;
  g1DataCw: number;
  g2Blocks: number;
  g2DataCw: number;
}

const VERSIONS_M: VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecPerBlock: 10, g1Blocks: 1, g1DataCw: 16, g2Blocks: 0, g2DataCw: 0 },
  { version: 2, totalCodewords: 44, ecPerBlock: 16, g1Blocks: 1, g1DataCw: 28, g2Blocks: 0, g2DataCw: 0 },
  { version: 3, totalCodewords: 70, ecPerBlock: 26, g1Blocks: 1, g1DataCw: 44, g2Blocks: 0, g2DataCw: 0 },
  { version: 4, totalCodewords: 100, ecPerBlock: 18, g1Blocks: 2, g1DataCw: 32, g2Blocks: 0, g2DataCw: 0 },
  { version: 5, totalCodewords: 134, ecPerBlock: 24, g1Blocks: 2, g1DataCw: 43, g2Blocks: 0, g2DataCw: 0 },
  { version: 6, totalCodewords: 172, ecPerBlock: 16, g1Blocks: 4, g1DataCw: 27, g2Blocks: 0, g2DataCw: 0 },
  { version: 7, totalCodewords: 196, ecPerBlock: 18, g1Blocks: 4, g1DataCw: 31, g2Blocks: 0, g2DataCw: 0 },
  { version: 8, totalCodewords: 242, ecPerBlock: 22, g1Blocks: 2, g1DataCw: 38, g2Blocks: 2, g2DataCw: 39 },
  { version: 9, totalCodewords: 292, ecPerBlock: 22, g1Blocks: 3, g1DataCw: 36, g2Blocks: 2, g2DataCw: 37 },
  { version: 10, totalCodewords: 346, ecPerBlock: 26, g1Blocks: 4, g1DataCw: 43, g2Blocks: 1, g2DataCw: 44 },
];

function totalDataCodewords(spec: VersionSpec): number {
  return spec.g1Blocks * spec.g1DataCw + spec.g2Blocks * spec.g2DataCw;
}

// ── 编码字节模式数据流:模式指示符(0100)+ 字符计数 + UTF-8 字节 + 终止符 + 填充 ─────
function encodeByteData(bytes: Uint8Array, spec: VersionSpec): number[] {
  const dataCwCount = totalDataCodewords(spec);
  // 版本 1–9 字符计数为 8 bit;10–26 为 16 bit。本表覆盖到 10。
  const countBits = spec.version <= 9 ? 8 : 16;

  const bits: number[] = [];
  const pushBits = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  pushBits(0b0100, 4); // 字节模式指示符
  pushBits(bytes.length, countBits); // 字符计数
  for (const b of bytes) pushBits(b, 8);

  // 终止符:最多 4 个 0(不超过容量)。
  const capacityBits = dataCwCount * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);

  // 补齐到整字节边界。
  while (bits.length % 8 !== 0) bits.push(0);

  // 转码字。
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let cw = 0;
    for (let j = 0; j < 8; j++) cw = (cw << 1) | bits[i + j];
    codewords.push(cw);
  }

  // 交替填充字节 0xEC / 0x11 直到填满数据容量。
  const padBytes = [0xec, 0x11];
  let p = 0;
  while (codewords.length < dataCwCount) {
    codewords.push(padBytes[p % 2]);
    p++;
  }

  return codewords;
}

// 按 QR 规范把数据/纠错码字分块后交错。
function interleaveCodewords(dataCodewords: number[], spec: VersionSpec): number[] {
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;

  const addBlocks = (count: number, dataCw: number) => {
    for (let i = 0; i < count; i++) {
      const data = dataCodewords.slice(offset, offset + dataCw);
      offset += dataCw;
      blocks.push({ data, ec: rsEncode(data, spec.ecPerBlock) });
    }
  };
  addBlocks(spec.g1Blocks, spec.g1DataCw);
  addBlocks(spec.g2Blocks, spec.g2DataCw);

  const result: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) result.push(b.data[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const b of blocks) result.push(b.ec[i]);
  }
  return result;
}

// ── 模块矩阵布局:功能图形(定位/校正/时序)、格式信息、数据布点、掩码 ──────────────
type Matrix = (boolean | null)[][];

function createMatrix(size: number): Matrix {
  return Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));
}

function placeFinder(m: Matrix, row: number, col: number): void {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= m.length || cc < 0 || cc >= m.length) continue;
      const inRing =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      m[rr][cc] = inRing;
    }
  }
}

// 版本对应的校正图形中心坐标(版本 1 无;2–10 取规范子集)。
const ALIGNMENT_CENTERS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function placeAlignment(m: Matrix, version: number): void {
  const centers = ALIGNMENT_CENTERS[version] ?? [];
  for (const cr of centers) {
    for (const cc of centers) {
      // 跳过与三个定位图形重叠的角。
      if (m[cr][cc] !== null) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const ring = Math.max(Math.abs(r), Math.abs(c));
          m[cr + r][cc + c] = ring !== 1;
        }
      }
    }
  }
}

function placeTiming(m: Matrix): void {
  for (let i = 8; i < m.length - 8; i++) {
    if (m[6][i] === null) m[6][i] = i % 2 === 0;
    if (m[i][6] === null) m[i][6] = i % 2 === 0;
  }
}

// 预留格式信息位(15 bit,定位图形周边)与暗模块,留待 applyFormatInfo 填实值。
function reserveFormatAreas(m: Matrix): void {
  const size = m.length;
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = false;
    if (m[i][8] === null) m[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = false;
    if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = false;
  }
  m[size - 8][8] = true; // 固定暗模块
}

function isFunctionModule(reserved: boolean[][], r: number, c: number): boolean {
  return reserved[r][c];
}

// 标记所有功能模块位置(数据布点时跳过)。
function buildReservedMask(m: Matrix): boolean[][] {
  return m.map((row) => row.map((v) => v !== null));
}

// 蛇形把数据比特填入非功能模块(从右下角起,每两列一组,Z 字上下)。
function placeData(m: Matrix, reserved: boolean[][], bits: number[]): void {
  const size = m.length;
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // 跳过竖向时序列
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (isFunctionModule(reserved, row, cc)) continue;
        const bit = bitIdx < bits.length ? bits[bitIdx] === 1 : false;
        m[row][cc] = bit;
        bitIdx++;
      }
    }
    upward = !upward;
  }
}

// 8 种掩码函数。
const MASK_FNS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(m: Matrix, reserved: boolean[][], maskIdx: number): Matrix {
  const fn = MASK_FNS[maskIdx];
  return m.map((row, r) =>
    row.map((v, c) => (isFunctionModule(reserved, r, c) ? v : (v as boolean) !== fn(r, c))),
  );
}

// 纠错等级 M 的格式信息位(含 BCH + 掩码异或常量),按掩码索引取 15 bit。
const FORMAT_INFO_M: number[] = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

function applyFormatInfo(m: Matrix, maskIdx: number): void {
  const size = m.length;
  const bits = FORMAT_INFO_M[maskIdx];
  const get = (i: number) => ((bits >> i) & 1) === 1;

  // 左上 + 周边两份冗余,布局严格按规范。
  for (let i = 0; i <= 5; i++) m[8][i] = get(i);
  m[8][7] = get(6);
  m[8][8] = get(7);
  m[7][8] = get(8);
  for (let i = 9; i <= 14; i++) m[14 - i][8] = get(i);

  for (let i = 0; i <= 7; i++) m[size - 1 - i][8] = get(i);
  for (let i = 8; i <= 14; i++) m[8][size - 15 + i] = get(i);
}

// 掩码惩罚评分(规范四规则),取最低分掩码。
function maskPenalty(m: Matrix): number {
  const size = m.length;
  const at = (r: number, c: number) => m[r][c] as boolean;
  let penalty = 0;

  // 规则 1:同色连续 ≥5。
  for (let r = 0; r < size; r++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let i = 1; i < size; i++) {
        const cur = horizontal ? at(r, i) : at(i, r);
        const prev = horizontal ? at(r, i - 1) : at(i - 1, r);
        if (cur === prev) {
          run++;
        } else {
          if (run >= 5) penalty += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) penalty += 3 + (run - 5);
    }
  }

  // 规则 2:2x2 同色块。
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = at(r, c);
      if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) penalty += 3;
    }
  }

  // 规则 3:1011101 模式(定位图形误判)。
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matchAt = (r: number, c: number, horizontal: boolean, pat: boolean[]) => {
    for (let i = 0; i < pat.length; i++) {
      const rr = horizontal ? r : r + i;
      const cc = horizontal ? c + i : c;
      if (rr >= size || cc >= size) return false;
      if (at(rr, cc) !== pat[i]) return false;
    }
    return true;
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const pat of [pat1, pat2]) {
        if (matchAt(r, c, true, pat)) penalty += 40;
        if (matchAt(r, c, false, pat)) penalty += 40;
      }
    }
  }

  // 规则 4:深色模块比例偏离 50%。
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (at(r, c)) dark++;
  const ratio = (dark * 100) / (size * size);
  const k = Math.floor(Math.abs(ratio - 50) / 5);
  penalty += k * 10;

  return penalty;
}

/**
 * 把任意字符串编成 QR 布尔矩阵(true=深色)。纠错等级 M,字节模式(UTF-8),自动选最小版本。
 * 内容超出版本 10 容量(数百字符)时抛错——本场景 URL 远不及此,触发即数据异常。
 */
export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  // 选最小可容纳的版本(预留模式指示符 4 bit + 字符计数 + 终止符的字节开销)。
  const spec = VERSIONS_M.find((v) => {
    const countBytes = v.version <= 9 ? 1 : 2;
    return bytes.length + 1 + countBytes <= totalDataCodewords(v);
  });
  if (!spec) {
    throw new Error('二维码内容过长，无法编码（超出支持的最大版本）');
  }

  const dataCodewords = encodeByteData(bytes, spec);
  const finalCodewords = interleaveCodewords(dataCodewords, spec);

  // 码字 → 比特流。
  const bits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  }

  const size = spec.version * 4 + 17;
  const base = createMatrix(size);
  placeFinder(base, 0, 0);
  placeFinder(base, 0, size - 7);
  placeFinder(base, size - 7, 0);
  placeAlignment(base, spec.version);
  placeTiming(base);
  reserveFormatAreas(base);
  const reserved = buildReservedMask(base);
  placeData(base, reserved, bits);

  // 选惩罚最低的掩码。
  let best: Matrix | null = null;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(base, reserved, mask);
    applyFormatInfo(masked, mask);
    const penalty = maskPenalty(masked);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      best = masked;
    }
  }

  return (best as Matrix).map((row) => row.map((v) => v === true));
}
