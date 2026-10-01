export interface LocationOption {
  label: string;
  type: 'airport' | 'train' | 'city';
}

export const MOROCCO_LOCATIONS: LocationOption[] = [
  // Airports
  { label: 'Aéroport Mohammed V – Casablanca', type: 'airport' },
  { label: 'Aéroport Marrakech-Ménara', type: 'airport' },
  { label: 'Aéroport Agadir Al Massira', type: 'airport' },
  { label: 'Aéroport Fès-Saïs', type: 'airport' },
  { label: 'Aéroport Rabat-Salé', type: 'airport' },
  { label: 'Aéroport Ibn Battuta – Tanger', type: 'airport' },
  { label: 'Aéroport Oujda-Angads', type: 'airport' },
  { label: 'Aéroport Nador-El Aroui', type: 'airport' },
  { label: 'Aéroport Essaouira-Mogador', type: 'airport' },
  { label: 'Aéroport Ouarzazate', type: 'airport' },
  { label: 'Aéroport Al Hoceïma', type: 'airport' },
  { label: 'Aéroport Laâyoune-Hassan I', type: 'airport' },
  { label: 'Aéroport Dakhla', type: 'airport' },
  { label: 'Aéroport Béni Mellal', type: 'airport' },
  // Train stations
  { label: 'Gare Casa-Voyageurs', type: 'train' },
  { label: 'Gare Casa-Port', type: 'train' },
  { label: 'Gare Casa-Oasis', type: 'train' },
  { label: 'Gare Rabat-Ville', type: 'train' },
  { label: 'Gare Rabat-Agdal', type: 'train' },
  { label: 'Gare Salé', type: 'train' },
  { label: 'Gare Marrakech', type: 'train' },
  { label: 'Gare Fès', type: 'train' },
  { label: 'Gare Meknès', type: 'train' },
  { label: 'Gare Tanger-Ville', type: 'train' },
  { label: 'Gare Kénitra', type: 'train' },
  { label: 'Gare El Jadida', type: 'train' },
  { label: 'Gare Safi', type: 'train' },
  { label: 'Gare Oujda', type: 'train' },
  { label: 'Gare Settat', type: 'train' },
  { label: 'Gare Mohammedia', type: 'train' },
  // Cities
  { label: 'Casablanca', type: 'city' },
  { label: 'Rabat', type: 'city' },
  { label: 'Marrakech', type: 'city' },
  { label: 'Fès', type: 'city' },
  { label: 'Tanger', type: 'city' },
  { label: 'Agadir', type: 'city' },
  { label: 'Meknès', type: 'city' },
  { label: 'Oujda', type: 'city' },
  { label: 'Kénitra', type: 'city' },
  { label: 'Tétouan', type: 'city' },
  { label: 'Safi', type: 'city' },
  { label: 'El Jadida', type: 'city' },
  { label: 'Béni Mellal', type: 'city' },
  { label: 'Nador', type: 'city' },
  { label: 'Errachidia', type: 'city' },
  { label: 'Ouarzazate', type: 'city' },
  { label: 'Essaouira', type: 'city' },
  { label: 'Laâyoune', type: 'city' },
  { label: 'Dakhla', type: 'city' },
  { label: 'Al Hoceïma', type: 'city' },
  { label: 'Tiznit', type: 'city' },
  { label: 'Taroudant', type: 'city' },
  { label: 'Chefchaouen', type: 'city' },
  { label: 'Ifrane', type: 'city' },
  { label: 'Khénifra', type: 'city' },
  { label: 'Guelmim', type: 'city' },
  { label: 'Zagora', type: 'city' },
  { label: 'Asilah', type: 'city' },
  // Small cities
  { label: 'Salé', type: 'city' },
  { label: 'Temara', type: 'city' },
  { label: 'Mohammedia', type: 'city' },
  { label: 'Settat', type: 'city' },
  { label: 'Berrechid', type: 'city' },
  { label: 'Khouribga', type: 'city' },
  { label: 'Youssoufia', type: 'city' },
  { label: 'Sidi Kacem', type: 'city' },
  { label: 'Sidi Slimane', type: 'city' },
  { label: 'Sidi Bennour', type: 'city' },
  { label: 'Souk el Arbaa', type: 'city' },
  { label: 'Larache', type: 'city' },
  { label: 'Ksar el Kebir', type: 'city' },
  { label: 'Fnideq', type: 'city' },
  { label: 'Martil', type: 'city' },
  { label: "M'diq", type: 'city' },
  { label: 'Taza', type: 'city' },
  { label: 'Guercif', type: 'city' },
  { label: 'Taourirt', type: 'city' },
  { label: 'Berkane', type: 'city' },
  { label: 'Oued Zem', type: 'city' },
  { label: 'Fquih Ben Salah', type: 'city' },
  { label: 'Azilal', type: 'city' },
  { label: 'Demnate', type: 'city' },
  { label: 'Kelaa des Sraghna', type: 'city' },
  { label: 'Chichaoua', type: 'city' },
  { label: 'Midelt', type: 'city' },
  { label: 'Azrou', type: 'city' },
  { label: 'Rich', type: 'city' },
  { label: 'Goulmima', type: 'city' },
  { label: 'Tinghir', type: 'city' },
  { label: 'Boumalne Dades', type: 'city' },
  { label: "Kelaat M'Gouna", type: 'city' },
  { label: 'Merzouga', type: 'city' },
  { label: 'Rissani', type: 'city' },
  { label: 'Erfoud', type: 'city' },
  { label: 'Alnif', type: 'city' },
  { label: 'Mhamid el Ghizlane', type: 'city' },
  { label: 'Foum Zguid', type: 'city' },
  { label: 'Tata', type: 'city' },
  { label: 'Akka', type: 'city' },
  { label: 'Sidi Ifni', type: 'city' },
  { label: 'Ait Melloul', type: 'city' },
  { label: 'Inzegane', type: 'city' },
  { label: 'Biougra', type: 'city' },
  { label: 'Tan-Tan', type: 'city' },
  { label: 'Tarfaya', type: 'city' },
  { label: 'Smara', type: 'city' },
  { label: 'Boujdour', type: 'city' },
  { label: 'Missour', type: 'city' },
  { label: 'Boulemane', type: 'city' },
  { label: 'Imouzzer Kandar', type: 'city' },
  { label: 'Sefrou', type: 'city' },
  { label: 'Jerada', type: 'city' },
  { label: 'Figuig', type: 'city' },
];

export function filterMoroccoLocations(q: string): LocationOption[] {
  if (!q.trim()) {
    // Default suggestions: a mix of airports, train stations, and major cities —
    // not just the first 8 array entries, which are all airports.
    const airports = MOROCCO_LOCATIONS.filter(l => l.type === 'airport').slice(0, 3);
    const trains    = MOROCCO_LOCATIONS.filter(l => l.type === 'train').slice(0, 2);
    const cities    = MOROCCO_LOCATIONS.filter(l => l.type === 'city').slice(0, 3);
    return [...airports, ...trains, ...cities];
  }
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const qn = norm(q);
  return MOROCCO_LOCATIONS.filter(l => norm(l.label).includes(qn)).slice(0, 12);
}

export function locationIcon(type: string): string {
  return type === 'airport' ? '✈️' : type === 'train' ? '🚉' : '🏙️';
}
