/** Curated carriers for Canadian hubs + common internationals (Uber-style picker). */

export type Airline = {
  id: string;
  name: string;
  iata?: string;
};

const RAW_AIRLINES: Airline[] = [
  { id: "ei", name: "Aer Lingus", iata: "EI" },
  { id: "am", name: "Aeroméxico", iata: "AM" },
  { id: "ac", name: "Air Canada", iata: "AC" },
  { id: "aca", name: "Air Canada Express", iata: "QK" },
  { id: "acr", name: "Air Canada Rouge", iata: "RV" },
  { id: "af", name: "Air France", iata: "AF" },
  { id: "ju", name: "Air Serbia", iata: "JU" },
  { id: "ts", name: "Air Transat", iata: "TS" },
  { id: "as", name: "Alaska Airlines", iata: "AS" },
  { id: "az", name: "Alitalia", iata: "AZ" },
  { id: "nh", name: "All Nippon Airways", iata: "NH" },
  { id: "aa", name: "American Airlines", iata: "AA" },
  { id: "dm", name: "Arajet", iata: "DM" },
  { id: "av", name: "Avianca", iata: "AV" },
  { id: "ba", name: "British Airways", iata: "BA" },
  { id: "cx", name: "Cathay Pacific", iata: "CX" },
  { id: "ci", name: "China Airlines", iata: "CI" },
  { id: "mu", name: "China Eastern", iata: "MU" },
  { id: "cz", name: "China Southern", iata: "CZ" },
  { id: "cm", name: "Copa Airlines", iata: "CM" },
  { id: "ok", name: "Czech Airlines", iata: "OK" },
  { id: "dl", name: "Delta Air Lines", iata: "DL" },
  { id: "ms", name: "EgyptAir", iata: "MS" },
  { id: "ek", name: "Emirates", iata: "EK" },
  { id: "et", name: "Ethiopian Airlines", iata: "ET" },
  { id: "ey", name: "Etihad Airways", iata: "EY" },
  { id: "ay", name: "Finnair", iata: "AY" },
  { id: "f8", name: "Flair Airlines", iata: "F8" },
  { id: "f9", name: "Frontier Airlines", iata: "F9" },
  { id: "g3", name: "Gol Linhas Aéreas", iata: "G3" },
  { id: "ha", name: "Hawaiian Airlines", iata: "HA" },
  { id: "ib", name: "Iberia", iata: "IB" },
  { id: "fi", name: "Icelandair", iata: "FI" },
  { id: "jl", name: "Japan Airlines", iata: "JL" },
  { id: "b6", name: "JetBlue", iata: "B6" },
  { id: "kq", name: "Kenya Airways", iata: "KQ" },
  { id: "kl", name: "KLM", iata: "KL" },
  { id: "ke", name: "Korean Air", iata: "KE" },
  { id: "la", name: "LATAM Airlines", iata: "LA" },
  { id: "lo", name: "LOT Polish Airlines", iata: "LO" },
  { id: "lh", name: "Lufthansa", iata: "LH" },
  { id: "mh", name: "Malaysia Airlines", iata: "MH" },
  { id: "pd", name: "Porter Airlines", iata: "PD" },
  { id: "qf", name: "Qantas", iata: "QF" },
  { id: "qr", name: "Qatar Airways", iata: "QR" },
  { id: "at", name: "Royal Air Maroc", iata: "AT" },
  { id: "rj", name: "Royal Jordanian", iata: "RJ" },
  { id: "sk", name: "SAS", iata: "SK" },
  { id: "sq", name: "Singapore Airlines", iata: "SQ" },
  { id: "wn", name: "Southwest Airlines", iata: "WN" },
  { id: "nk", name: "Spirit Airlines", iata: "NK" },
  { id: "sa", name: "South African Airways", iata: "SA" },
  { id: "lx", name: "SWISS", iata: "LX" },
  { id: "tp", name: "TAP Air Portugal", iata: "TP" },
  { id: "tg", name: "Thai Airways", iata: "TG" },
  { id: "tk", name: "Turkish Airlines", iata: "TK" },
  { id: "ua", name: "United Airlines", iata: "UA" },
  { id: "vs", name: "Virgin Atlantic", iata: "VS" },
  { id: "vb", name: "VivaAerobus", iata: "VB" },
  { id: "y4", name: "Volaris", iata: "Y4" },
  { id: "ws", name: "WestJet", iata: "WS" },
  { id: "wsen", name: "WestJet Encore", iata: "WR" },
];

export const AIRLINES: readonly Airline[] = RAW_AIRLINES.slice().sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" })
);

function normalizeLetter(ch: string): string {
  const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const c = base.charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

export function airlineInitial(name: string): string {
  const t = (name || "").trim();
  if (!t) return "?";
  return normalizeLetter(t.charAt(0));
}

export function filterAirlines(query: string, list: readonly Airline[] = AIRLINES): Airline[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  return list.filter((a) => {
    if (a.name.toLowerCase().includes(q)) return true;
    if (a.iata && a.iata.toLowerCase() === q) return true;
    if (a.iata && a.iata.toLowerCase().startsWith(q)) return true;
    return false;
  });
}

export type AirlineSection = { title: string; data: Airline[] };

export function groupAirlinesByLetter(list: readonly Airline[]): AirlineSection[] {
  const map = new Map<string, Airline[]>();
  for (const a of list) {
    const letter = airlineInitial(a.name);
    const bucket = map.get(letter) || [];
    bucket.push(a);
    map.set(letter, bucket);
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });
  return keys.map((title) => ({
    title,
    data: (map.get(title) || []).sort((x, y) =>
      x.name.localeCompare(y.name, "en", { sensitivity: "base" })
    ),
  }));
}
