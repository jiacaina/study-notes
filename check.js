#!/usr/bin/env node
// 结构校验：解析 SUB 数据，检查完整性与常见错误
const fs = require('fs');

const FILE = '知识图谱汇总.html';
const src = fs.readFileSync(FILE, 'utf8');

const m = src.match(/const SUB=(\[[\s\S]*?\n\]);/);
if (!m) { console.error('✗ 未能定位 SUB 数据'); process.exit(1); }

let SUB;
try { SUB = eval(m[1]); }
catch (e) { console.error('✗ SUB 解析失败：', e.message); process.exit(1); }

let chapters = 0, entries = 0, flows = 0, steps = 0, figs = 0;
const problems = [];

for (const S of SUB) {
  if (!S.k || !S.name || !Array.isArray(S.M) || !Array.isArray(S.F))
    problems.push(`学科字段缺失: ${S.name || S.k}`);

  const c = S.M.reduce((a, b) => a + b.g.reduce((p, d) => p + d.r.length, 0), 0);
  chapters += S.M.length;
  entries += c;
  flows += S.F.length;
  steps += S.F.reduce((a, b) => a + b.s.length, 0);

  for (const M of S.M) {
    if (M.fig) figs += [].concat(M.fig).length;
    if (!M.spine) problems.push(`缺少 spine: ${S.name} / ${M.t}`);
    if (!M.map || !M.map.length) problems.push(`缺少 map: ${S.name} / ${M.t}`);

    for (const g of M.g) for (const r of g.r) {
      if (r.length < 3) problems.push(`条目字段不足: ${S.name} / ${M.t} / ${r[0]}`);
      for (const cell of r) {
        if (typeof cell !== 'string') continue;
        // 数学模式里不能有裸中文（会触发 KaTeX unicodeTextInMathMode 告警）
        for (const p of (cell.match(/\$[^$]+\$/g) || [])) {
          if (/[\u4e00-\u9fa5]/.test(p.replace(/\\text\{[^}]*\}/g, '')))
            problems.push(`数学模式含裸中文: ${S.name} / ${M.t} / ${r[0]}`);
        }
      }
    }
  }

  const line = (S.no ? S.no + ' ' : '  ') + S.name.padEnd(8) +
    ' 章 ' + String(S.M.length).padStart(2) +
    ' | 条目 ' + String(c).padStart(4) +
    ' | 流程 ' + String(S.F.length).padStart(2);
  console.log(line);
}

console.log('—'.repeat(46));
console.log(`合计 ${SUB.length} 门 | ${chapters} 章 | ${entries} 条 | ${flows} 套流程 | ${steps} 步 | ${figs} 张图`);

if (problems.length) {
  console.log('\n发现 ' + problems.length + ' 个问题：');
  problems.forEach(p => console.log('  ✗ ' + p));
  process.exit(1);
}
console.log('\n✓ 结构校验通过');
