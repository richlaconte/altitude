// The booking flow's simulated clinic (#403). Slots are real holds: choosing a time holds it for ten minutes and the
// hold says when it ends. A text code works for five minutes. Booking takes the hold, the verified number and a request
// key, so sending it twice books once. The fixtures: someone else takes your held time, the bank declines the card,
// the code expires.
import { createDemoService, reject } from '../shared/service';

export interface Treatment { id: string; name: string; minutes: number; price: number; about: string }
export const TREATMENTS: Treatment[] = [
  { id: 'assessment', name: 'Initial assessment', minutes: 60, price: 7500, about: 'For a new problem. History, examination and a plan.' },
  { id: 'follow-up', name: 'Follow-up', minutes: 30, price: 5000, about: 'Treatment and exercises, if you’ve been assessed here before.' },
  { id: 'massage', name: 'Sports massage', minutes: 45, price: 6000, about: 'Deep tissue work for tight or overworked muscles.' },
];
export const ADDON = { name: 'Printed exercise plan', price: 500 };
export const BOOKING_FEE = 150;
export const CARD = 'Visa ending 4242';
export const CLINIC = 'Kinetic Physio, 14 Harbour Street';
export const HOLD_MINUTES = 10;
export const CODE_MINUTES = 5;
export const TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

export const treatment = (id: string) => TREATMENTS.find((t) => t.id === id);
export const money = (cents: number) => `€${(cents / 100).toFixed(2)}`;
export const total = (service: string, addon: boolean) => (treatment(service)?.price ?? 0) + (addon ? ADDON.price : 0) + BOOKING_FEE;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00`); d.setDate(d.getDate() + n); return iso(d); };
export const today = () => iso(new Date());
/** The clinic is closed on Sundays. */
export const closed = (date: string) => new Date(`${date}T12:00`).getDay() === 0;
export const firstOpen = () => { let d = addDays(today(), 1); while (closed(d)) d = addDays(d, 1); return d; };
export const lastBookable = () => addDays(today(), 28);
export const dayName = (date: string) => new Date(`${date}T12:00`).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
export const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false });

// Some times are booked already. The pattern depends only on the date, so a day looks the same every visit.
const bookedBefore = (date: string, time: string) => {
  let h = 0;
  for (const ch of date + time) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 3 === 0;
};

export interface Slot { time: string; free: boolean }
export interface Hold { id: string; date: string; time: string; until: number }
export interface Booking { ref: string; requestId: string; service: string; addon: boolean; date: string; time: string; name: string; email: string; phone: string; total: number; status: 'booked' | 'cancelled'; refund?: number }
interface Store {
  taken: Record<string, string>;
  hold: Hold | null;
  code: { phone: string; value: string; until: number } | null;
  verified: Record<string, string>;
  declineNext: boolean;
  bookings: Booking[];
  seq: number;
}

const seed = (): Store => ({ taken: {}, hold: null, code: null, verified: {}, declineNext: false, bookings: [], seq: 1 });
const key = (date: string, time: string) => `${date} ${time}`;
const now = () => Date.now();
const digits = (phone: string) => phone.replace(/\D/g, '');
export const phoneOk = (phone: string) => /^\+?[\d\s()-]+$/.test(phone.trim()) && digits(phone).length >= 9 && digits(phone).length <= 15;
export const masked = (phone: string) => `•••• ${digits(phone).slice(-4)}`;
const live = (s: Store, id: string) => (s.hold && s.hold.id === id && s.hold.until > now() && !s.taken[key(s.hold.date, s.hold.time)] ? s.hold : null);

export const service = createDemoService<Store>({
  name: 'booking',
  seed,
  handlers: {
    'slots.list': {
      read: (s, d: { date: string }): Slot[] => (closed(d.date) ? [] : TIMES.map((time) => ({ time, free: !bookedBefore(d.date, time) && !s.taken[key(d.date, time)] }))),
    },
    'slots.hold': {
      write: (s, d: { date: string; time: string }) => {
        if (closed(d.date) || bookedBefore(d.date, d.time) || s.taken[key(d.date, d.time)]) {
          reject('invalid', `${d.time} on ${dayName(d.date)} was just booked by someone else. Choose another time.`, { field: 'time' });
        }
        const hold: Hold = { id: `h${s.seq}`, date: d.date, time: d.time, until: now() + HOLD_MINUTES * 60_000 };
        return { state: { ...s, seq: s.seq + 1, hold }, result: hold };
      },
    },
    'hold.get': { read: (s, d: { id: string }) => live(s, d.id) },
    'code.send': {
      write: (s, d: { phone: string }) => {
        if (!phoneOk(d.phone)) reject('invalid', 'Enter a mobile number with 9 to 15 digits.', { field: 'phone' });
        const value = String(482913 + s.seq * 7919).slice(-6);
        const until = now() + CODE_MINUTES * 60_000;
        return { state: { ...s, seq: s.seq + 1, code: { phone: digits(d.phone), value, until } }, result: { to: masked(d.phone), until, text: value } };
      },
    },
    'code.verify': {
      write: (s, d: { phone: string; code: string }) => {
        const c = s.code;
        if (!c || c.phone !== digits(d.phone)) reject('invalid', 'Send a code to this number first.', { field: 'code' });
        if (c!.until <= now()) reject('invalid', 'That code has expired. Send a new one.', { field: 'code' });
        if (c!.value !== d.code) reject('invalid', 'That code doesn’t match the one we sent. Check the message and try again.', { field: 'code' });
        const token = `v${s.seq}`;
        return { state: { ...s, seq: s.seq + 1, code: null, verified: { ...s.verified, [token]: c!.phone } }, result: { token } };
      },
    },
    'booking.create': {
      write: (s, d: Omit<Booking, 'ref' | 'total' | 'status'> & { hold: string; token: string }) => {
        const again = s.bookings.find((b) => b.requestId === d.requestId);
        if (again) return { state: s, result: again };
        const hold = live(s, d.hold);
        if (!hold) reject('invalid', `${d.time} on ${dayName(d.date)} was booked by someone else while you were filling in your details. Nothing was charged.`, { field: 'time' });
        if (s.verified[d.token] !== digits(d.phone)) reject('invalid', 'Verify your mobile number again: it changed after the code was checked.', { field: 'phone' });
        // A decline is an answer, not an error: the bank said no once, and the next try goes through.
        if (s.declineNext) return { state: { ...s, declineNext: false }, result: { declined: `Your bank declined the ${CARD}. Nothing was charged, and ${d.time} is still held for you until ${clock(hold!.until)}.` } };
        const { hold: _h, token: _t, ...answers } = d;
        const b: Booking = { ...answers, ref: `KP-${String(4180 + s.seq)}`, total: total(d.service, d.addon), status: 'booked' };
        return { state: { ...s, seq: s.seq + 1, hold: null, taken: { ...s.taken, [key(d.date, d.time)]: b.ref }, bookings: [...s.bookings, b] }, result: b };
      },
    },
    'booking.find': { read: (s, d: { requestId: string }) => s.bookings.find((b) => b.requestId === d.requestId) ?? null },
    'booking.cancel': {
      write: (s, d: { ref: string }) => {
        const b = s.bookings.find((x) => x.ref === d.ref) ?? reject('not-found', 'We couldn’t find that booking.');
        if (b.status === 'cancelled') return { state: s, result: b };
        const next: Booking = { ...b, status: 'cancelled', refund: refundFor(b) };
        const taken = { ...s.taken }; delete taken[key(b.date, b.time)];
        return { state: { ...s, taken, bookings: s.bookings.map((x) => (x.ref === b.ref ? next : x)) }, result: next };
      },
    },
  },
});

/** Free until 24 hours before; after that half the treatment's price is kept. The booking fee is always refunded. */
export const refundFor = (b: Pick<Booking, 'date' | 'time' | 'total' | 'service'>) => {
  const late = new Date(`${b.date}T${b.time}`).getTime() - now() < 24 * 3_600_000;
  return late ? b.total - Math.round((treatment(b.service)?.price ?? 0) / 2) : b.total;
};

export const events = [
  {
    label: 'Someone else books your held time',
    run: () => service.external('Someone else booked the held time', (s) => (s.hold ? { ...s, taken: { ...s.taken, [key(s.hold.date, s.hold.time)]: 'someone' }, hold: null } : s)),
  },
  { label: 'The bank declines the next charge', run: () => service.external('The bank will decline the next charge', (s) => ({ ...s, declineNext: true })) },
  { label: 'The text code expires', run: () => service.external('The text code expired', (s) => (s.code ? { ...s, code: { ...s.code, until: now() - 1 } } : s)) },
];
