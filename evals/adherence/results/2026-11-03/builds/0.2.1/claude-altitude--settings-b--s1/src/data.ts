export interface Practice {
  name: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
  vets: number;
  appointmentsThisWeek: number;
  timezone: string;
}

export const initialPractice: Practice = {
  name: 'Riverbend Veterinary Clinic',
  email: 'frontdesk@riverbendvet.com',
  phone: '(503) 555-0148',
  address: '2210 SE Hawthorne Blvd, Portland, OR 97214',
  hours: 'Mon–Fri 8:00–18:00 · Sat 9:00–13:00',
  vets: 4,
  appointmentsThisWeek: 87,
  timezone: 'America/Los_Angeles',
};

/** Pretend network write. There is no backend, so this just waits. */
export function savePractice(p: Practice): Promise<Practice> {
  return new Promise((resolve) => setTimeout(() => resolve(p), 800));
}
