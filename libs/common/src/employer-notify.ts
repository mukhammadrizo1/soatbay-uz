import { MSG } from './messages';

/** Ish beruvchiga e'lon to'lganda yuboriladigan ishchilar ro'yxati matni. */
export function renderEmployerJobFullMessage(
  seq: number,
  workers: { fullName: string; phone: string | null }[],
): string {
  const list = workers
    .map((w, i) => `${i + 1}. ${w.fullName} — ${w.phone ?? '—'}`)
    .join('\n');
  return MSG.employer.jobFullWorkersList(seq, list);
}
