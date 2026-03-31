/* ── COURSES DATA MODULE ─────────────────────────────
   Single source of truth for courses stored in localStorage.
   Shared between index.html (client) and admin.html (manager).
─────────────────────────────────────────────────────── */

const STORAGE_KEY = 'souplesse_courses';
const CLIENTS_KEY = 'souplesse_clients';

const PRICE_MIN = 1000;
const PRICE_MAX = 3000;

const getRandomTempPrice = () => Math.round((Math.floor(Math.random() * (PRICE_MAX - PRICE_MIN + 1) + PRICE_MIN)) / 100) * 100;

const ensureCoursePrices = (courses) => {
  let modified = false;
  courses.forEach(c => {
    if (c.price === undefined || c.price === null || c.price === '') {
      c.price = getRandomTempPrice();
      modified = true;
    } else {
      c.price = Number(c.price);
    }
  });
  return modified;
};

/* ── Default seed courses ───────────────────────────── */
const DEFAULT_COURSES = [
  {
    id: 'c1',
    title: 'Reformer Foundations',
    coach: 'Amira Benali',
    coachEmail: 'amira@souplesse.dz',
    dateTime: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
    description: 'Découvrez les bases du Reformer Pilates dans un cadre bienveillant. Idéal pour commencer votre voyage.',
    capacity: 8,
    booked: 2,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  },
  {
    id: 'c2',
    title: 'Core & Flow',
    coach: 'Yasmine Hadj',
    coachEmail: 'yasmine@souplesse.dz',
    dateTime: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    description: 'Un enchaînement fluide axé sur le centre du corps. Respirez, connectez-vous et progressez.',
    capacity: 6,
    booked: 1,
    image: 'https://images.unsplash.com/photo-1540206395-68808572332f?w=800&q=80',
  },
  {
    id: 'c3',
    title: 'Stretch & Restore',
    coach: 'Lina Mansouri',
    coachEmail: 'lina@souplesse.dz',
    dateTime: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 16),
    description: 'Séance douce de récupération active. Étirements profonds et relâchement musculaire complet.',
    capacity: 10,
    booked: 5,
    image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=800&q=80',
  },
  {
    id: 'c4',
    title: 'Power Reformer',
    coach: 'Amira Benali',
    coachEmail: 'amira@souplesse.dz',
    dateTime: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16),
    description: 'Challenge cardio-musculaire intensif. Poussez vos limites sur le Reformer.',
    capacity: 5,
    booked: 4,
    image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&q=80',
  },
  {
    id: 'c5',
    title: 'Barre & Balance',
    coach: 'Yasmine Hadj',
    coachEmail: 'yasmine@souplesse.dz',
    dateTime: new Date(Date.now() + 86400000 * 6).toISOString().slice(0, 16),
    description: 'Associez la danse classique et le Pilates pour sculpter et tonifier en douceur.',
    capacity: 8,
    booked: 0,
    image: 'https://images.unsplash.com/photo-1601925228008-e9acc5c9adce?w=800&q=80',
  },
];

/* ── COURSES API ────────────────────────────────────── */

const CoursesDB = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seedCourses = JSON.parse(JSON.stringify(DEFAULT_COURSES));
      ensureCoursePrices(seedCourses);
      this.saveAll(seedCourses);
      return seedCourses;
    }

    const courses = JSON.parse(raw);
    const modified = ensureCoursePrices(courses);
    if (modified) this.saveAll(courses);

    return courses;
  },
  saveAll(courses) { localStorage.setItem(STORAGE_KEY, JSON.stringify(courses)); },
  add(course) { const c = this.getAll(); c.push(course); this.saveAll(c); },
  update(id, patch) { this.saveAll(this.getAll().map(c => c.id === id ? {...c,...patch} : c)); },
  remove(id) { this.saveAll(this.getAll().filter(c => c.id !== id)); },
  bookSpot(id) {
    const courses = this.getAll();
    const course = courses.find(c => c.id === id);
    if (!course || course.booked >= course.capacity) return false;
    course.booked += 1;
    this.saveAll(courses);
    return true;
  },
  spotsLeft(course) { return course.capacity - course.booked; },
};

/* ── CLIENTS API ────────────────────────────────────── */

const ClientsDB = {
  getAll() { const r = localStorage.getItem(CLIENTS_KEY); return r ? JSON.parse(r) : []; },
  saveAll(c) { localStorage.setItem(CLIENTS_KEY, JSON.stringify(c)); },
  add(client) { const c = this.getAll(); c.push(client); this.saveAll(c); },
  getByCourse(courseId) { return this.getAll().filter(c => c.courseId === courseId); },
  remove(id) { this.saveAll(this.getAll().filter(c => c.id !== id)); },
};

/* ── CLIENT PROFILES API ────────────────────────────── */

const CLIENT_PROFILES_KEY = 'souplesse_client_profiles';
const ClientProfilesDB = {
  getAll() { const r = localStorage.getItem(CLIENT_PROFILES_KEY); return r ? JSON.parse(r) : []; },
  saveAll(p) { localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(p)); },
  getProfile(email) {
    return this.getAll().find(p => p.email.toLowerCase() === email.toLowerCase());
  },
  addOrUpdateReservation(name, email, reservation) {
    const profiles = this.getAll();
    const existing = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      existing.name = name; // Update name just in case
      existing.reservations.push(reservation);
    } else {
      profiles.push({
        name: name,
        email: email,
        reservations: [reservation]
      });
    }
    this.saveAll(profiles);
  }
};