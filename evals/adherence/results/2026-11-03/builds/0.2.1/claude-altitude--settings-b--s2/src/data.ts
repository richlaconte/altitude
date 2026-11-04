export interface PracticeSettings {
  name: string;
  email: string;
}

export interface Practice extends PracticeSettings {
  phone: string;
  address: string;
  hours: string;
  vets: number;
  appointmentsThisWeek: number;
  onlineBooking: boolean;
}

export const initialPractice: Practice = {
  name: 'Willow Creek Veterinary Clinic',
  email: 'frontdesk@willowcreekvet.com',
  phone: '(503) 555-0148',
  address: '2210 SE Hawthorne Blvd, Portland, OR 97214',
  hours: 'Mon–Fri 8:00–18:00 · Sat 9:00–13:00',
  vets: 4,
  appointmentsThisWeek: 126,
  onlineBooking: true,
};
