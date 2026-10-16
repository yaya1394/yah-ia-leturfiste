import { TicketRequest, TicketResult } from '../src/types/turf.js';

// Combinaisons mathématiques C(n, k) = n! / (k! * (n-k)!)
function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - (k - i))) / i;
  }
  return Math.round(c);
}

export const FORMULES_INFOS: Record<string, { nom: string; tailleRequise: number; miseBase: number }> = {
  SIMPLE_GAGNANT: { nom: 'Simple Gagnant', tailleRequise: 1, miseBase: 1.5 },
  SIMPLE_PLACE: { nom: 'Simple Placé', tailleRequise: 1, miseBase: 1.5 },
  COUPLE_GAGNANT: { nom: 'Couplé Gagnant', tailleRequise: 2, miseBase: 1.0 },
  COUPLE_PLACE: { nom: 'Couplé Placé', tailleRequise: 2, miseBase: 1.0 },
  DEUX_SUR_QUATRE: { nom: '2 sur 4', tailleRequise: 2, miseBase: 3.0 },
  TIERCE: { nom: 'Tiercé', tailleRequise: 3, miseBase: 1.0 },
  QUARTE: { nom: 'Quarté+', tailleRequise: 4, miseBase: 1.5 },
  QUINTE: { nom: 'Quinté+', tailleRequise: 5, miseBase: 2.0 },
  MULTI_4: { nom: 'Multi en 4', tailleRequise: 4, miseBase: 3.0 },
  MULTI_5: { nom: 'Multi en 5', tailleRequise: 5, miseBase: 3.0 },
  MULTI_6: { nom: 'Multi en 6', tailleRequise: 6, miseBase: 3.0 },
  MULTI_7: { nom: 'Multi en 7', tailleRequise: 7, miseBase: 3.0 },
};

/**
 * Calculateur officiel PMU de tickets et combinaisons
 */
export function calculateTicket(req: TicketRequest, totalPartantsCourse = 16): TicketResult {
  const info = FORMULES_INFOS[req.formule] || FORMULES_INFOS.QUINTE;
  const k = info.tailleRequise;
  const bases = Array.from(new Set(req.bases || []));
  const associes = Array.from(new Set((req.associes || []).filter((a) => !bases.includes(a))));

  let nbCombinaisons = 0;
  let explication = '';
  let codeTicketPMU = '';

  const flexiMult = req.flexi === 25 ? 0.25 : req.flexi === 50 ? 0.5 : 1.0;
  const miseDeBase = req.miseUnitaire || info.miseBase;

  if (req.typePari === 'UNITAIRE') {
    nbCombinaisons = 1;
    explication = `Pari unitaire standard sur ${k} chevaux : ${bases.slice(0, k).join(' - ')}`;
    codeTicketPMU = `${info.nom.toUpperCase()} : ${bases.slice(0, k).join(' - ')}`;
  } else if (req.typePari === 'COMBINE') {
    const totalChevaux = bases.length + associes.length;
    if (totalChevaux < k) {
      nbCombinaisons = 0;
      explication = `Il vous faut au moins ${k} chevaux pour un pari combiné ${info.nom}.`;
    } else {
      nbCombinaisons = combinations(totalChevaux, k);
      explication = `Combiné de ${totalChevaux} chevaux pris en ${k} places (${nbCombinaisons} combinaisons possibles)`;
      codeTicketPMU = `${info.nom.toUpperCase()} COMBINÉ : ${[...bases, ...associes].join(' - ')}`;
    }
  } else if (req.typePari === 'CHAMP_REDUIT') {
    const nbBases = bases.length;
    const placesRestantes = k - nbBases;

    if (placesRestantes <= 0) {
      nbCombinaisons = 1;
      explication = `Vous avez déjà sélectionné toutes les ${k} bases.`;
    } else if (associes.length < placesRestantes) {
      nbCombinaisons = 0;
      explication = `Il manque des chevaux associés (au moins ${placesRestantes} requis pour compléter vos ${nbBases} bases).`;
    } else {
      nbCombinaisons = combinations(associes.length, placesRestantes);
      explication = `Champ Réduit avec ${nbBases} base(s) et ${associes.length} associés (${nbCombinaisons} combinaisons)`;
      const xPlaceholders = Array(placesRestantes).fill('X').join(' - ');
      codeTicketPMU = `${info.nom.toUpperCase()} CH. RÉDUIT : ${bases.join(' - ')} - ${xPlaceholders} / associés: ${associes.join(', ')}`;
    }
  } else if (req.typePari === 'CHAMP_TOTAL') {
    const nbBases = bases.length;
    const placesRestantes = k - nbBases;
    const poolRestant = Math.max(0, totalPartantsCourse - nbBases);

    if (placesRestantes <= 0) {
      nbCombinaisons = 1;
      explication = `Vos ${k} bases couvrent déjà le ticket unitaire.`;
    } else {
      nbCombinaisons = combinations(poolRestant, placesRestantes);
      explication = `Champ Total avec ${nbBases} base(s) associées à tous les ${poolRestant} autres partants (${nbCombinaisons} combinaisons)`;
      codeTicketPMU = `${info.nom.toUpperCase()} CH. TOTAL : ${bases.join(' - ')} - TOTAL`;
    }
  }

  const coutTotal = +(nbCombinaisons * miseDeBase * flexiMult).toFixed(2);

  if (flexiMult < 1) {
    codeTicketPMU += ` (Flexi ${req.flexi}%)`;
  }

  return {
    formule: req.formule,
    nomFormule: info.nom,
    typePari: req.typePari,
    bases,
    associes,
    nbCombinaisons,
    miseDeBaseOfficielle: miseDeBase,
    flexiPourcent: req.flexi,
    coutTotal,
    explication,
    codeTicketPMU,
  };
}
