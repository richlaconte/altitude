// In-memory stand-in for the clinic's practice service. There is no backend: data lives for the page session only.
// Add ?fail=1 to the URL to make every save fail, to exercise the failure and retry path.

export interface PracticeDetails {
  name: string;
  email: string;
}

export interface Practice extends PracticeDetails {
  phone: string;
  address: string;
  vets: number;
  appointmentsThisWeek: number;
  updatedAt: Date;
  updatedBy: string;
}

let practice: Practice = {
  name: 'Harbourside Veterinary Clinic',
  email: 'bookings@harbourside-vets.example',
  phone: '01632 960 418',
  address: '14 Quay Street, Falmouth TR11 3HH',
  vets: 4,
  appointmentsThisWeek: 87,
  updatedAt: new Date('2026-10-21T09:42:00'),
  updatedBy: 'Dr Priya Raman',
};

const listeners = new Set<() => void>();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getPractice(): Practice {
  return practice;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type SaveResult =
  | { ok: true; value: PracticeDetails }
  | { ok: false; error: string };

export async function savePracticeDetails(details: PracticeDetails): Promise<SaveResult> {
  await wait(800);
  if (new URLSearchParams(location.search).has('fail')) {
    return { ok: false, error: 'We couldn’t reach the server. Your changes are still here; try saving again.' };
  }
  const value = { name: details.name.trim(), email: details.email.trim() };
  practice = { ...practice, ...value, updatedAt: new Date(), updatedBy: 'You' };
  listeners.forEach((fn) => fn());
  return { ok: true, value };
}
