// In-memory stand-in for the booking app's practice service. There is no backend: this module holds the
// practice record for the page's lifetime and simulates network latency. Replace `savePracticeDetails`
// with the real API call; it must resolve only once the server has stored the change.

export interface PracticeDetails {
  name: string;
  contactEmail: string;
}

export interface PracticeOverview extends PracticeDetails {
  id: string;
  phone: string;
  address: string;
  vets: number;
  appointmentsThisWeek: number;
  openingHours: string;
}

let practice: PracticeOverview = {
  id: 'hollybank',
  name: 'Hollybank Veterinary Practice',
  contactEmail: 'reception@hollybankvets.example',
  phone: '0161 496 0732',
  address: '14 Larkhill Road, Stockport SK4 2EP',
  vets: 5,
  appointmentsThisWeek: 186,
  openingHours: 'Mon–Fri 8:00–19:00, Sat 9:00–13:00',
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getPractice(): PracticeOverview {
  return practice;
}

/** Sample-only switch so the failure path can be tried without a server. */
export const demo = { failNextSave: false };

export async function savePracticeDetails(details: PracticeDetails): Promise<PracticeDetails> {
  await wait(900);
  if (demo.failNextSave) {
    throw new Error('We couldn’t reach the server. Your changes are still here, so try saving again.');
  }
  practice = { ...practice, name: details.name.trim(), contactEmail: details.contactEmail.trim() };
  return { name: practice.name, contactEmail: practice.contactEmail };
}
