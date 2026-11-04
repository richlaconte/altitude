// A stand-in for the clinic's booking service. There is no backend in this project, so the
// request is kept in memory for this page only. Replace `sendAppointmentRequest` with a real
// call that resolves only once the clinic has stored the request.

export type AppointmentType = 'check-up' | 'hygiene' | 'problem-tooth';

export interface AppointmentRequest {
  type: AppointmentType | '';
  name: string;
  email: string;
  date: string | null; // ISO 'YYYY-MM-DD'
}

export interface StoredRequest extends AppointmentRequest {
  reference: string;
}

export const clinic = {
  name: 'Harbourside Dental Care',
  address: '14 Quay Street, Falmouth',
  phone: '01326 318 442',
  hours: [
    { days: 'Monday to Thursday', time: '8:00 to 18:00' },
    { days: 'Friday', time: '8:00 to 16:30' },
    { days: 'Saturday', time: '9:00 to 13:00' },
    { days: 'Sunday', time: 'Closed' },
  ],
};

export const appointmentTypes: { value: AppointmentType; label: string; description: string }[] = [
  { value: 'check-up', label: 'Check-up', description: 'A routine examination with one of our dentists, about 20 minutes.' },
  { value: 'hygiene', label: 'Hygiene', description: 'A scale and polish with our hygienist, about 30 minutes.' },
  { value: 'problem-tooth', label: 'A problem tooth', description: 'Pain, a chip or a lost filling. We’ll look at it and plan what’s next.' },
];

const stored: StoredRequest[] = [];

export async function sendAppointmentRequest(request: AppointmentRequest): Promise<StoredRequest> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const saved = { ...request, reference: `HDC-${String(4182 + stored.length)}` };
  stored.push(saved);
  return saved;
}
