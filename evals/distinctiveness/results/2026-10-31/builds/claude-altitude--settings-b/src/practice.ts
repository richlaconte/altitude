import type {EditRecordResult} from 'altitude-design';

export interface Practice {
  name: string;
  contactEmail: string;
}

export const initialPractice: Practice = {
  name: 'Riverside Animal Clinic',
  contactEmail: 'frontdesk@riversideanimalclinic.com',
};

/** Details the overview shows but this screen doesn't edit. */
export const practiceDetails = {
  phone: '(503) 555-0142',
  address: '1180 SE Water Ave, Portland, OR 97214',
  hours: 'Mon–Fri 8:00–18:00, Sat 9:00–13:00',
  vets: 'Dr. Ana Morales, Dr. James Okafor, Dr. Priya Raman',
};

export const todaysAppointments = [
  {time: '09:00', patient: 'Biscuit (Beagle)', owner: 'Hannah Lee', reason: 'Annual vaccination'},
  {time: '10:30', patient: 'Miso (Domestic shorthair)', owner: 'Daniel Kim', reason: 'Dental check'},
  {time: '13:15', patient: 'Pepper (Labrador)', owner: 'Sofia Alvarez', reason: 'Limping, front left leg'},
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePractice(draft: Practice): Partial<Record<keyof Practice, string>> {
  const errors: Partial<Record<keyof Practice, string>> = {};
  if (!draft.name.trim()) errors.name = 'Enter the practice name.';
  else if (draft.name.trim().length > 80) errors.name = 'Use 80 characters or fewer for the practice name.';
  if (!draft.contactEmail.trim()) errors.contactEmail = 'Enter a contact email.';
  else if (!EMAIL.test(draft.contactEmail.trim())) errors.contactEmail = 'Enter an email address like frontdesk@example.com.';
  return errors;
}

/**
 * Demo service: there is no backend. It waits like a network call and succeeds. Add `?fail-save` to the URL to make
 * saves fail, so the failure and retry states can be checked.
 */
export async function savePractice(draft: Practice): Promise<EditRecordResult<Practice>> {
  await new Promise((r) => setTimeout(r, 800));
  if (new URLSearchParams(window.location.search).has('fail-save')) {
    return {ok: false, error: 'We couldn’t save the practice details. Your changes are still here. Try again.'};
  }
  return {ok: true, value: {name: draft.name.trim(), contactEmail: draft.contactEmail.trim()}};
}
