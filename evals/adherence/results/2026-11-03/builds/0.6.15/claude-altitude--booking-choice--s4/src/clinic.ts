// Sample clinic data and a stand-in service. There is no backend: the request is held in memory only.

export type AppointmentType = 'checkup' | 'hygiene' | 'problem';

export interface AppointmentRequestDraft {
  type: AppointmentType | '';
  name: string;
  email: string;
  /** ISO calendar date, 'YYYY-MM-DD'. */
  date: string | null;
}

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string; description: string }[] = [
  { value: 'checkup', label: 'Check-up', description: '20 minutes with a dentist, including X-rays if they are due.' },
  { value: 'hygiene', label: 'Hygiene', description: '30 minutes with a hygienist: scale, polish and advice.' },
  {
    value: 'problem',
    label: 'Problem tooth',
    description: 'Pain, a chip or a lost filling. We look at it and plan treatment.',
  },
];

export const CLINIC = {
  name: 'Shore Road Dental Practice',
  address: ['14 Shore Road', 'Leith, Edinburgh', 'EH6 6RJ'],
  phone: '0131 496 0732',
  phoneHref: '+441314960732',
  hours: [
    ['Monday to Thursday', '8:00 – 18:30'],
    ['Friday', '8:00 – 16:00'],
    ['Saturday', '9:00 – 13:00'],
    ['Sunday', 'Closed'],
  ] as [string, string][],
};

export const sentRequests: AppointmentRequestDraft[] = [];

/** Simulates the network round trip. Swap for the real booking service. */
export function sendAppointmentRequest(draft: AppointmentRequestDraft): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      sentRequests.push({ ...draft });
      resolve();
    }, 700);
  });
}
