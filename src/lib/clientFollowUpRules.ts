import type { Client, ClientFollowUp, FollowUpOutcome } from '../types';

export const FOLLOW_UP_LABELS: Record<FollowUpOutcome, string> = {
  reached: 'Contact établi', no_answer: 'Sans réponse', interested: 'Intéressé(e)', declined: 'Ne souhaite pas poursuivre',
};

export function validateFollowUpInput(input: { outcome?: unknown; notes?: unknown; nextContactDate?: unknown }, today: string) {
  if (typeof input.outcome !== 'string' || !Object.hasOwn(FOLLOW_UP_LABELS, input.outcome)) throw new Error('Résultat de contact invalide.');
  if (typeof input.notes !== 'string' || input.notes.trim().length > 1000) throw new Error('La note doit contenir au maximum 1 000 caractères.');
  const date = input.nextContactDate;
  if (date !== null && date !== undefined && date !== '') {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date de rappel invalide.');
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today) throw new Error('Choisissez une date de rappel à partir d’aujourd’hui.');
  }
  if (input.outcome === 'declined' && date) throw new Error('Un refus ne doit pas programmer de rappel.');
  return { outcome: input.outcome as FollowUpOutcome, notes: input.notes.trim(), nextContactDate: date ? String(date) : null };
}

export function getLatestFollowUp(client: Pick<Client, 'followUps'>): ClientFollowUp | undefined {
  return client.followUps?.at(-1);
}

export function isFollowUpDeferred(client: Pick<Client, 'followUps'>, today: string): boolean {
  const latest = getLatestFollowUp(client);
  return latest?.outcome === 'declined' || Boolean(latest?.nextContactDate && latest.nextContactDate > today);
}
