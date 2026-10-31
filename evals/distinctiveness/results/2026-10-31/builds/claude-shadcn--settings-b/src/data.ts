export type Practice = {
  name: string
  email: string
}

export const initialPractice: Practice = {
  name: "Riverside Animal Hospital",
  email: "frontdesk@riversideanimalhospital.com",
}

export const practiceDetails = {
  phone: "(503) 555-0142",
  address: "2140 SE Division St, Portland, OR 97202",
  hours: "Mon–Fri 7:30am–7pm · Sat 9am–3pm",
}

export const todayStats = [
  { label: "Appointments today", value: "28" },
  { label: "Checked in", value: "11" },
  { label: "Open slots", value: "6" },
]

export type Appointment = {
  time: string
  pet: string
  species: string
  owner: string
  reason: string
  vet: string
  status: "Checked in" | "Confirmed" | "Pending"
}

export const upcomingAppointments: Appointment[] = [
  {
    time: "10:30 AM",
    pet: "Biscuit",
    species: "Golden Retriever",
    owner: "Maya Okafor",
    reason: "Annual wellness exam",
    vet: "Dr. Lindqvist",
    status: "Checked in",
  },
  {
    time: "11:00 AM",
    pet: "Juniper",
    species: "Domestic Shorthair",
    owner: "Tom Alvarez",
    reason: "Dental cleaning",
    vet: "Dr. Patel",
    status: "Confirmed",
  },
  {
    time: "11:15 AM",
    pet: "Pepper",
    species: "Holland Lop rabbit",
    owner: "Grace Kim",
    reason: "Nail trim, weight check",
    vet: "Dr. Lindqvist",
    status: "Confirmed",
  },
  {
    time: "11:45 AM",
    pet: "Otis",
    species: "French Bulldog",
    owner: "Daniel Brooks",
    reason: "Limping, right hind leg",
    vet: "Dr. Patel",
    status: "Pending",
  },
]
