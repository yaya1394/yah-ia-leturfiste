export type Discipline = 'TROT_ATTELE' | 'TROT_MONTE' | 'PLAT' | 'OBSTACLE' | 'HAIES' | 'STEEPLE_CHASE';

export interface Participant {
  numPmu: number;
  nom: string;
  driver: string;
  entraineur: string;
  musique: string;
  age: number;
  sexe: 'M' | 'F' | 'H';
  race?: string;
  poids?: number;
  corde?: number;
  gainsParticipant?: {
    gainsCarriere?: number;
    gainsVictoires?: number;
    gainsPlace?: number;
  };
  deferre?: 'DEFERRE_ANTERIEURS_POSTERIEURS' | 'DEFERRE_ANTERIEURS' | 'DEFERRE_POSTERIEURS' | 'PROTEGE_ANTERIEURS_POSTERIEURS' | null;
  oeilleres?: 'SANS_OEILLERES' | 'OEILLERES_CLASSIQUES' | 'OEILLERES_AUSTRALASIAN' | null;
  dernierRapportDirect?: {
    rapport: number;
    tendance?: 'HAUSSE' | 'BAISSE' | 'STABLE';
    favoris?: boolean;
    grossePrise?: boolean;
  };
  dernierRapportReference?: {
    rapport: number;
  };
  // Detailed Career & Pedigree fields
  robe?: string;
  pere?: string;
  mere?: string;
  pereDeMere?: string;
  proprietaire?: string;
  eleveur?: string;
  recordAbsolu?: string;
  nbCoursesCarriere?: number;
  nbVictoires?: number;
  nbPlaces?: number;
  valeurHandicap?: number | string;
  urlCasaque?: string;
  avisExpert?: string;
  commentaireApresCourse?: string;

  // Algorithmic fields computed by Yah.IA
  algoScore?: number; // 0 - 100
  confianceIndice?: number; // 0 - 100%
  probabiliteVictoire?: number; // percentage
  probabilitePlace?: number; // percentage
  statutYahIA?: 'BASE' | 'CHALLENGER' | 'COUP_DE_COEUR' | 'OUTSIDER' | 'TOCARD_VALUE' | 'SECOND_CHOIX' | 'ELIMINE';
  pointsForts?: string[];
  pointsFaibles?: string[];
  casaqueCouleur?: string;

  // New specific rankings fields
  scoreLightGBM?: number; // Score arbre de décision (ex: 94.5 pts)
  scoreFormePrevisionnelle?: number; // 0 - 100
  labelForme?: string;
  scoreReussitePrevisionnelle?: number; // % réussite prévisionnelle
  labelReussite?: string;
  ordreArrivee?: number; // 1, 2, 3, 4, 5 si course terminée
  coursesPassees?: CoursePassee[];
}

export interface CoursePassee {
  date: string; // DD/MM/YYYY
  hippodrome: string;
  nomCourse: string;
  distance: number;
  discipline: string;
  corde: string;
  allocation: number;
  valeurHandicap?: number | string;
  rang: number | string; // 1, 2, 3, 0 (non placé), D, Da, Dai, Arr, etc.
  gains: number; // allocations perçues par le cheval
  cote: number;
  deferre: string; // D4, DA, DP, F
  driver?: string;
  reductionKilometrique?: string;
  poids?: number;
  terrain?: string;
  nbPartants?: number;
}

export interface Course {
  id: string;
  reunionNum: number;
  courseNum: number;
  nom: string;
  heureDepart: string;
  timestampDepart?: number;
  hippodrome: string;
  discipline: Discipline;
  distance: number;
  allocationTotale: number;
  nbPartants: number;
  corde: 'GAUCHE' | 'DROITE';
  surfacePiste: string;
  etatTerrain?: string;
  isQuinte: boolean;
  participants: Participant[];
  tirelireMontant?: number;

  // Arrivée officielle
  isArriveeDefinitive?: boolean;
  ordreArrivee?: number[]; // [5, 6, 9, 13, 1]
  statutCourse?: 'A_VENIR' | 'DEPART_IMMINENT' | 'ARRIVEE_PROVISOIRE' | 'ARRIVEE_DEFINITIVE';
}

export interface Reunion {
  numOfficiel: number;
  nomHippodrome: string;
  pays: string;
  disciplinePrincipale: string;
  date: string; // DDMMYYYY
  courses: Array<{
    numOfficiel: number;
    nom: string;
    heureDepart: string;
    distance: number;
    discipline: Discipline;
    nbPartants: number;
    isQuinte: boolean;
    allocation: number;
    isArriveeDefinitive?: boolean;
    ordreArrivee?: number[];
    statutCourse?: 'A_VENIR' | 'DEPART_IMMINENT' | 'ARRIVEE_PROVISOIRE' | 'ARRIVEE_DEFINITIVE';
  }>;
}

export interface PredictionResult {
  raceId: string;
  reunionNum: number;
  courseNum: number;
  date: string;
  hippodrome: string;
  nomCourse: string;
  discipline: Discipline;
  indiceDifficulte: 'FACILE' | 'EQUILIBREE' | 'LOTERIE';
  
  // Specific rankings requested
  topLightGBM: Participant[];
  topPodium: Participant[];
  topFormePrevisionnelle: Participant[];
  topReussitePrevisionnelle: Participant[];
  selectionHuit: Participant[]; // Top Ultime
  syntheseChiffree: number[];

  baseIncontournable: Participant;
  challengerDirect: Participant;
  coupDeCoeur: Participant;
  tocardValue: Participant;
  commentaireTactique: string;
  tauxRentabiliteEstime: string;
}

export interface TicketRequest {
  formule: 'SIMPLE_GAGNANT' | 'SIMPLE_PLACE' | 'COUPLE_GAGNANT' | 'COUPLE_PLACE' | 'DEUX_SUR_QUATRE' | 'TIERCE' | 'QUARTE' | 'QUINTE' | 'MULTI_4' | 'MULTI_5' | 'MULTI_6' | 'MULTI_7';
  typePari: 'UNITAIRE' | 'COMBINE' | 'CHAMP_REDUIT' | 'CHAMP_TOTAL';
  bases: number[];
  associes: number[];
  flexi: 100 | 50 | 25;
  miseUnitaire?: number;
}

export interface TicketResult {
  formule: string;
  nomFormule: string;
  typePari: string;
  bases: number[];
  associes: number[];
  nbCombinaisons: number;
  miseDeBaseOfficielle: number;
  flexiPourcent: number;
  coutTotal: number;
  explication: string;
  codeTicketPMU: string;
}

export interface AIAnalysisResponse {
  titre: string;
  scenarioDeCourse: string;
  analyseFavorites: string;
  secretsDesTocards: string;
  conseilDeJeu: {
    budgetPetit: string;
    budgetMoyen: string;
    budgetConfort: string;
  };
  pronoTop8: number[];
  genereLe: string;
  modele: string;
}
