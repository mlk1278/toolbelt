// Writes brief.md: the reviewer handoff ux-gate §3 describes, built from a finished run.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const box = b => (b ? `${Math.round(b.width)}×${Math.round(b.height)} at (${Math.round(b.x)}, ${Math.round(b.y)})` : '—');

// The base side is reported, labelled `before`, but never fails the run: a new screen has no base.
export function writeBrief({ outDir, beforeDir, matrix, entries, beforeEntries, report, beforeReport, run }) {
  const lines = [];
  const images = [];
  const unchanged = [];
  const before = new Map((beforeEntries || []).map(e => [e.tag, e]));
  const abs = (dir, file) => join(dir, file);
  const image = (tag, file, note) => {
    images.push(`Image ${images.length + 1}: ${tag}${note ? ` — ${note}` : ''}\n  ${file}`);
  };
  const notes = new Map();
  for (const pathway of matrix.pathways) {
    for (const step of pathway.steps) if (step.note) notes.set(`${pathway.name}/${step.name}`, step.note);
  }

  for (const entry of entries) {
    const note = notes.get(`${entry.pathway}/${entry.step}`);
    const role = entry.pathway.startsWith('match-') || entry.pathway === 'reference' ? 'reference ' : '';
    const main = entry.files.target || entry.files.still;
    if (!main) continue;
    const prior = before.get(entry.tag);
    const priorFile = prior && (prior.files.target || prior.files.still);
    if (prior && entry.targetDiff && entry.targetDiff.status === 'unchanged') {
      unchanged.push(`- ${entry.tag}: pixel-identical to before\n  before ${abs(beforeDir, priorFile)}\n  after  ${abs(outDir, main)}`);
      continue;
    }
    if (beforeDir) {
      if (priorFile) image(`before ${entry.tag}`, abs(beforeDir, priorFile), note);
      const status = priorFile ? (entry.targetDiff ? entry.targetDiff.status : 'compared') : `new${prior && prior.error ? `; before: ${prior.error}` : ''}`;
      image(`after ${entry.tag} (${status})`, abs(outDir, main), note);
    } else {
      image(`${role}${entry.tag}`, abs(outDir, main), note);
    }
    entry.files.crops.forEach((crop, i) => image(`${entry.tag} crop ${i + 1}`, abs(outDir, crop)));
    if (entry.files.filmstrip) image(`${entry.tag} motion filmstrip`, abs(outDir, entry.files.filmstrip));
  }

  lines.push('# UX capture brief', '');
  lines.push(`Head: ${run.head || 'unknown'}${run.base ? ` · Base: ${run.base}` : ''} · App: ${report.app}`);
  lines.push(`Review file: ${join(outDir, 'review.md')}`);
  if (matrix.designReference) lines.push(`Design reference: ${matrix.designReference}`);
  lines.push('', '## Images', '', images.length ? images.join('\n') : 'None.');
  if (unchanged.length) lines.push('', '## Unchanged', '', ...unchanged);
  lines.push('', '## Criteria', '');
  lines.push(...(matrix.criteria && matrix.criteria.length ? matrix.criteria.map((c, i) => `${i + 1}. ${c}`) : ['None given in the matrix.']));
  lines.push('', '## Not reached', '');
  const notReached = [
    ...report.notReached.map(n => `- ${n.tag}: ${n.reason}`),
    ...(beforeReport ? beforeReport.notReached.map(n => `- before ${n.tag}: ${n.reason}`) : []),
  ];
  lines.push(...(notReached.length ? notReached : ['None.']));
  const findings = [];
  for (const entry of entries) {
    for (const c of entry.checks) {
      if (c.severity === 'nit' || c.check === 'not-reached') continue;
      findings.push(`- ${entry.tag}: ${c.severity} ${c.check}${c.selector ? ` ${c.selector}` : ''}${c.message ? ` — ${c.message}` : ''}`);
    }
  }
  for (const f of report.unusedFixtures) findings.push(`- fixture never requested: ${f.method || 'GET'} ${f.url}${f.pathway ? ` (${f.pathway})` : ''}`);
  lines.push('', '## Mechanical findings (should and above)', '', ...(findings.length ? [...new Set(findings)] : ['None.']));
  lines.push('', '## Measurements', '', '| Shot | Target | Matches | Clipped | Page overflow |', '|---|---|---|---|---|');
  for (const entry of entries) {
    if (!entry.target) continue;
    const m = entry.measurements || {};
    const overflow = m.scrollWidth > m.clientWidth ? `${m.scrollWidth - m.clientWidth}px` : 'none';
    lines.push(`| ${entry.tag} | ${entry.target.selector} ${box(entry.target.box)} | ${entry.target.matched} | ${entry.target.clipped ? 'yes' : 'no'} | ${overflow} |`);
  }
  lines.push('', '## Requests answered or aborted', '');
  const sides = [['', report], ...(beforeReport ? [['before ', beforeReport]] : [])];
  const requests = sides.flatMap(([side, r]) => r.requests.map(q =>
    `- ${side}${q.kind} ${q.method} ${q.url}${q.status ? ` → ${q.status}` : ''} ×${q.count} (${q.pathways.join(', ')})`));
  lines.push(...(requests.length ? requests : ['None.']));
  const setup = sides.flatMap(([side, r]) => r.setup.map(s => `- ${side}${s.method} ${s.url} → ${s.status} as ${s.name}`));
  if (setup.length) lines.push('', '## Setup calls (real data created)', '', ...setup);
  writeFileSync(join(outDir, 'brief.md'), `${lines.join('\n')}\n`);
}
