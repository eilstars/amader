import { Meal, Member } from './types';
import { isBalanced, plateAverage } from './game';
import { dateText, handsText, plateLine, slotName, timeText } from './words';

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Only photos that a PDF can show: links to the family's private storage, or photos kept inside the app. */
const printable = (uri: string | null | undefined) => !!uri && (/^https:\/\//.test(uri) || /^data:image\/(jpeg|png);base64,/.test(uri));

export interface SummaryInput {
  me: Member;
  meals: Meal[];
  since: Date;
  now: Date;
  grain: string;
  checkup: Date | null;
}

/**
 * The doctor summary: a plain log of what one person ate, as a printable page.
 * No readings, no scores, no advice. Portions are hand measures, which the page says.
 */
export function summaryHtml({ me, meals, since, now, grain, checkup }: SummaryInput): string {
  const real = meals.filter((m) => m.slot !== 'fasting');
  const days = new Set(meals.map((m) => new Date(m.date).toDateString())).size;
  const span = Math.max(1, Math.floor((now.getTime() - since.getTime()) / 86_400_000));
  const avg = plateAverage(real);
  const fasting = meals.filter((m) => m.slot === 'fasting').length;
  const snacks = real.filter((m) => m.slot === 'snack').length;
  const together = real.filter((m) => (m.withIds?.length ?? 0) > 0 || m.withOthers).length;
  const party = real.filter((m) => m.party).length;

  const rows: [string, string][] = [
    ['Meals shared', String(real.length)],
    ['Days with something logged', `${days} of ${span}`],
    ['Snacks', String(snacks)],
    ['Fasting days', String(fasting)],
    ['Meals eaten with others', String(together)],
    ['Party or buffet plates', String(party)],
    [`Usual ${grain.toLowerCase()} or grains`, avg.counted ? `${handsText(avg.grains, 'fist', 'fists')} a meal` : 'Not recorded'],
    ['Usual protein', avg.counted ? `${handsText(avg.protein, 'palm', 'palms')} a meal` : 'Not recorded'],
    ['Usual vegetables', avg.counted ? `${handsText(avg.veg, 'handful', 'handfuls')} a meal` : 'Not recorded'],
    ['Meals with fruit', String(real.filter((m) => (m.fruit ?? 0) > 0).length)],
    ['Meals with milk or yoghurt', String(real.filter((m) => (m.dairy ?? 0) > 0).length)],
    ['Plates with half vegetables and some protein', avg.counted ? `${real.filter(isBalanced).length} of ${avg.counted}` : 'Not recorded'],
  ];

  const photos = real.filter((m) => printable(m.photo)).slice(0, 12);
  const log = meals.slice(0, 60);

  return `<!doctype html><html><head><meta charset="utf-8"><title>Meal summary for ${esc(me.name)}</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1D2B24; font-size: 12pt; line-height: 1.45; }
  h1 { font-size: 22pt; margin: 0 0 2pt; color: #145A41; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; color: #145A41; border-bottom: 1.5pt solid #D5DDD6; padding-bottom: 3pt; }
  .muted { color: #56675E; font-size: 10.5pt; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5pt 4pt; border-bottom: 0.5pt solid #E3E8E4; vertical-align: top; }
  td.v { text-align: right; font-weight: 600; white-space: nowrap; }
  .grid { display: flex; flex-wrap: wrap; gap: 8pt; }
  .ph { width: 30%; font-size: 9.5pt; color: #56675E; }
  .ph img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6pt; display: block; margin-bottom: 2pt; }
  .log td { font-size: 10.5pt; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { color: #1F7A5A; font-weight: 700; font-size: 14pt; }
  .note { margin-top: 18pt; padding: 8pt 10pt; background: #F1F4EE; border-radius: 6pt; font-size: 10pt; color: #56675E; }
</style></head><body>
<div class="head"><div><h1>Meal summary for ${esc(me.name)}</h1>
<div class="muted">${dateText(since)} to ${dateText(now)}, ${now.getFullYear()}${checkup ? ` · for the checkup on ${dateText(checkup)}` : ''}</div></div>
<div class="brand">Amader</div></div>

<h2>At a glance</h2>
<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}</table>
<p class="muted">Portions are hand measures the person chose themselves: a fist of grains is about half a cup, a palm of protein is about 3 to 4 oz, a handful of vegetables is about one cup.</p>

${photos.length ? `<h2>Recent plates</h2><div class="grid">${photos.map((m) => `<div class="ph"><img src="${esc(m.photo as string)}" alt=""><b>${dateText(new Date(m.date))}</b>, ${esc(slotName(m.slot).toLowerCase())}${m.dish ? `<br>${esc(m.dish)}` : ''}</div>`).join('')}</div>` : ''}

<h2>Meal log</h2>
<table class="log">${log
    .map((m) => {
      const what = [m.dish, plateLine(m, grain), m.note ? `"${m.note}"` : null, m.party ? 'party plate' : null].filter(Boolean).join(' · ');
      return `<tr><td style="white-space:nowrap">${dateText(new Date(m.date))}, ${timeText(m.date)}</td><td>${esc(slotName(m.slot))}</td><td>${esc(what || '')}</td></tr>`;
    })
    .join('')}</table>
${meals.length > log.length ? `<p class="muted">Showing the newest ${log.length} of ${meals.length} entries.</p>` : ''}

<div class="note">A simple log of meals shared in the Amader app by ${esc(me.name)}. Portions are rough hand measures, not weighed amounts. It is not a medical record and has no readings or advice.</div>
</body></html>`;
}
