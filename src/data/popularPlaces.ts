// Curated popular places for offline-first search.
// Coordinates are approximate (±200-500 m) — good enough for nearest-station
// routing, not for door-precise navigation. Aliases (`k`) catch common
// alternate spellings/abbreviations users type.

export type PopularPlaceType =
  | 'monument' | 'temple' | 'mosque' | 'museum'
  | 'mall' | 'market' | 'food'
  | 'park' | 'lake'
  | 'science' | 'transport' | 'education' | 'research'
  | 'hospital' | 'stadium' | 'area' | 'bridge' | 'club';

export const POPULAR_PLACE_LABELS: Record<PopularPlaceType, string> = {
  monument: 'Heritage Monument',
  temple: 'Temple',
  mosque: 'Mosque',
  museum: 'Museum',
  mall: 'Mall',
  market: 'Market',
  food: 'Food Street',
  park: 'Park',
  lake: 'Lake',
  science: 'Science & Exhibition',
  transport: 'Transport Hub',
  education: 'Campus',
  research: 'Research Institute',
  hospital: 'Hospital',
  stadium: 'Stadium',
  area: 'Neighbourhood',
  bridge: 'Bridge',
  club: 'Club',
};

export type PopularPlaceLang = 'en' | 'gu' | 'hi';

const LABELS_GU: Record<PopularPlaceType, string> = {
  monument: 'વારસાગત સ્મારક',
  temple: 'મંદિર',
  mosque: 'મસ્જિદ',
  museum: 'સંગ્રહાલય',
  mall: 'મોલ',
  market: 'બજાર',
  food: 'ફૂડ સ્ટ્રીટ',
  park: 'બગીચો',
  lake: 'તળાવ',
  science: 'વિજ્ઞાન પ્રદર્શન',
  transport: 'પરિવહન કેન્દ્ર',
  education: 'કૅમ્પસ',
  research: 'સંશોધન સંસ્થા',
  hospital: 'હોસ્પિટલ',
  stadium: 'સ્ટેડિયમ',
  area: 'વિસ્તાર',
  bridge: 'પુલ',
  club: 'ક્લબ',
};

const LABELS_HI: Record<PopularPlaceType, string> = {
  monument: 'विरासत स्मारक',
  temple: 'मंदिर',
  mosque: 'मस्जिद',
  museum: 'संग्रहालय',
  mall: 'मॉल',
  market: 'बाज़ार',
  food: 'फूड स्ट्रीट',
  park: 'पार्क',
  lake: 'झील',
  science: 'विज्ञान प्रदर्शनी',
  transport: 'परिवहन केंद्र',
  education: 'कैंपस',
  research: 'अनुसंधान संस्थान',
  hospital: 'अस्पताल',
  stadium: 'स्टेडियम',
  area: 'इलाका',
  bridge: 'पुल',
  club: 'क्लब',
};

export const getPlaceLabel = (type: PopularPlaceType, lang: PopularPlaceLang = 'en'): string =>
  lang === 'gu' ? LABELS_GU[type] : lang === 'hi' ? LABELS_HI[type] : POPULAR_PLACE_LABELS[type];

export interface PopularPlace {
  /** Display name */
  n: string;
  /** Category */
  t: PopularPlaceType;
  /** [lat, lng] */
  c: [number, number];
  /** Extra lowercase search keywords (space separated), optional */
  k?: string;
}

export const popularPlaces: PopularPlace[] = [
  // ── Heritage & Monuments ────────────────────────────────────────────────
  { n: 'Sabarmati Ashram', t: 'monument', c: [23.0585, 72.5798], k: 'gandhi ashram gandhi smarak sabarmati' },
  { n: 'Sabarmati Riverfront', t: 'monument', c: [23.0430, 72.5690], k: 'river front nadi' },
  { n: 'Atal Pedestrian Bridge', t: 'bridge', c: [23.0230, 72.5730], k: 'atal bridge foot over bridge' },
  { n: 'Manek Chowk', t: 'market', c: [23.0225, 72.5720], k: 'manek chowk night food market old city' },
  { n: 'Rani no Hajiro', t: 'monument', c: [23.0232, 72.5845], k: 'rani no hajiro mughalai' },
  { n: 'Jama Masjid', t: 'mosque', c: [23.0233, 72.5837], k: 'jama masjid jumma mosque' },
  { n: 'Teen Darwaja', t: 'monument', c: [23.0240, 72.5850], k: 'teen darwaza gate' },
  { n: 'Bhadra Fort', t: 'monument', c: [23.0250, 72.5848], k: 'bhadra fort bhadra kali maidan' },
  { n: 'Sidi Saiyyed Mosque', t: 'mosque', c: [23.0252, 72.5810], k: 'sidi saiyyed jali sidi sayed' },
  { n: 'Hutheesing Jain Temple', t: 'temple', c: [23.0390, 72.5940], k: 'hathi singh jain derasar' },
  { n: 'Dada Hari ni Vav', t: 'monument', c: [23.0400, 72.6000], k: 'dada hari stepwell vav asarva' },
  { n: 'Sidi Bashir Mosque (Shaking Minarets)', t: 'monument', c: [23.0010, 72.5950], k: 'shaking minarets jhulta minara sarangpur' },
  { n: 'Sarkhej Roza', t: 'monument', c: [23.0080, 72.5050], k: 'sarkhej roza makbara' },
  { n: 'Adalaj Stepwell', t: 'monument', c: [23.1653, 72.5808], k: 'adalaj ni vav adalaj step well' },
  { n: 'Calico Museum of Textiles', t: 'museum', c: [23.0380, 72.5900], k: 'calico textile museum shahibaug' },
  { n: 'Sardar Vallabhbhai Patel National Memorial', t: 'museum', c: [23.0605, 72.5855], k: 'moti shahi mahal patel memorial shahibaug' },
  { n: 'Lalbhai Dalpatbhai Museum', t: 'museum', c: [23.0365, 72.5445], k: 'ld museum navrangpura' },

  // ── Temples ─────────────────────────────────────────────────────────────
  { n: 'Swaminarayan Temple Kalupur', t: 'temple', c: [23.0290, 72.6020], k: 'swaminarayan mandir kalupur' },
  { n: 'ISKCON Temple', t: 'temple', c: [23.0175, 72.5115], k: 'iskcon radha govinda mandir sg highway' },
  { n: 'Jagannath Temple Jamalpur', t: 'temple', c: [22.9925, 72.5855], k: 'jagannath mandir rathyatra jamalpur' },
  { n: 'Camp Hanuman Temple', t: 'temple', c: [23.0655, 72.5810], k: 'camp hanuman shahibaug cantonment' },
  { n: 'Akshardham Temple Gandhinagar', t: 'temple', c: [23.2296, 72.6655], k: 'akshardham swaminarayan gandhinagar' },

  // ── Malls & Markets ─────────────────────────────────────────────────────
  { n: 'Ahmedabad One Mall', t: 'mall', c: [23.0400, 72.5240], k: 'alpha one mall vastrapur' },
  { n: 'Palladium Mall', t: 'mall', c: [23.0355, 72.5075], k: 'palladium sg highway ahmedabad mall' },
  { n: 'Iscon Mega Mall', t: 'mall', c: [23.0225, 72.5115], k: 'iscon mega mall sg highway' },
  { n: 'Himalaya Mall', t: 'mall', c: [23.0450, 72.5100], k: 'himalaya mall drive in road' },
  { n: 'Titanium City Centre', t: 'mall', c: [23.0130, 72.5130], k: 'titanium city centre mall satellite' },
  { n: 'Municipal Market', t: 'market', c: [23.0325, 72.5525], k: 'municipal market navrangpura cg road' },
  { n: 'Law Garden Night Market', t: 'market', c: [23.0256, 72.5589], k: 'law garden night market choker bazaar' },
  { n: 'Ravivari (Gujari Bazaar)', t: 'market', c: [23.0220, 72.5750], k: 'ravivari gujari sunday market riverfront' },
  { n: 'C.G. Road', t: 'market', c: [23.0280, 72.5560], k: 'cg road char rasta shopping navrangpura' },

  // ── Food Streets ────────────────────────────────────────────────────────
  { n: 'Sindhu Bhavan Road', t: 'food', c: [23.0335, 72.4850], k: 'sbr sindhu bhavan restaurants bodakdev' },

  // ── Parks & Lakes ───────────────────────────────────────────────────────
  { n: 'Kankaria Lake', t: 'lake', c: [23.0060, 72.6035], k: 'kankariya kankaria talav front' },
  { n: 'Kamla Nehru Zoo', t: 'park', c: [23.0055, 72.6060], k: 'zoo ahmedabad kankaria zoo' },
  { n: 'Law Garden', t: 'park', c: [23.0256, 72.5589], k: 'law garden ellisbridge' },
  { n: 'Parimal Garden', t: 'park', c: [23.0213, 72.5566], k: 'parimal gardan ellisbridge' },
  { n: 'Vastrapur Lake', t: 'lake', c: [23.0355, 72.5295], k: 'vastralpur talav vastrapur' },
  { n: 'Prahlad Nagar Garden', t: 'park', c: [23.0105, 72.5080], k: 'prahladnagar garden' },
  { n: 'Indroda Nature Park', t: 'park', c: [23.2020, 72.6355], k: 'indroda dinosaur fossil park gandhinagar' },
  { n: 'Sarita Udyan', t: 'park', c: [23.2160, 72.6540], k: 'sarita udyan gandhinagar riverfront' },
  { n: 'Punit Van', t: 'park', c: [23.2240, 72.6390], k: 'punit van gandhinagar' },

  // ── Science & Exhibitions ───────────────────────────────────────────────
  { n: 'Gujarat Science City', t: 'science', c: [23.0765, 72.5110], k: 'science city hebatpur planetarium' },
  { n: 'Mahatma Mandir', t: 'science', c: [23.2455, 72.6485], k: 'mahatma mandir convention gandhinagar exhibition' },
  { n: 'Infocity', t: 'science', c: [23.1897, 72.6295], k: 'info city gandhinagar it park' },
  { n: 'GIFT City', t: 'science', c: [23.1595, 72.6845], k: 'gift city gujarat international finance tec' },

  // ── Transport Hubs ──────────────────────────────────────────────────────
  { n: 'Sardar Vallabhbhai Patel International Airport', t: 'transport', c: [23.0780, 72.6256], k: 'ahmedabad airport svpi hansol domestic international' },
  { n: 'Ahmedabad Junction Railway Station', t: 'transport', c: [23.0259, 72.6009], k: 'kalupur railway station adI junction train' },
  { n: 'Maninagar Railway Station', t: 'transport', c: [22.9960, 72.6050], k: 'maninagar station train' },
  { n: 'Sabarmati Railway Station', t: 'transport', c: [23.0700, 72.5820], k: 'sabarmati station train' },
  { n: 'Asarva Railway Station', t: 'transport', c: [23.0435, 72.6005], k: 'asarwa station train' },
  { n: 'Gandhinagar Capital Railway Station', t: 'transport', c: [23.2345, 72.6430], k: 'gnc gandhinagar capital station train' },
  { n: 'Geeta Mandir Bus Stand (GSRTC)', t: 'transport', c: [23.0105, 72.5725], k: 'central bus station gsrtc geeta mandir st depot' },

  // ── Education & Research ────────────────────────────────────────────────
  { n: 'IIM Ahmedabad', t: 'education', c: [23.0326, 72.5355], k: 'indian institute management iima vastrapur' },
  { n: 'National Institute of Design', t: 'education', c: [23.0075, 72.5540], k: 'nid paldi design school' },
  { n: 'CEPT University', t: 'education', c: [23.0348, 72.5505], k: 'cept architecture navrangpura university' },
  { n: 'Gujarat University', t: 'education', c: [23.0355, 72.5430], k: 'gujarat university navrangpura' },
  { n: 'Gujarat Technological University', t: 'education', c: [23.1065, 72.5900], k: 'gtu chandkheda university' },
  { n: 'Gujarat Vidyapith', t: 'education', c: [23.0445, 72.5545], k: 'gujarat vidyapith ashram road university' },
  { n: 'Nirma University', t: 'education', c: [23.1575, 72.4955], k: 'nirma institute technology sg highway' },
  { n: "St. Xavier's College", t: 'education', c: [23.0330, 72.5480], k: 'st xavier college navrangpura' },
  { n: 'Physical Research Laboratory', t: 'research', c: [23.0350, 72.5440], k: 'prl navrangpura space research' },
  { n: 'Space Applications Centre (ISRO)', t: 'research', c: [23.0230, 72.5380], k: 'isro sac jodhpur tekra satellite satellite' },

  // ── Hospitals ───────────────────────────────────────────────────────────
  { n: 'New Civil Hospital (BJ Medical College)', t: 'hospital', c: [23.0440, 72.5905], k: 'civil hospital asarwa bj medical' },
  { n: 'Zydus Hospital', t: 'hospital', c: [23.0810, 72.5080], k: 'zydus sola bhailal amin' },
  { n: 'Shalby Hospital', t: 'hospital', c: [23.0125, 72.5060], k: 'shalby multi specialty sg highway' },
  { n: 'Gujarat High Court', t: 'research', c: [23.0855, 72.5075], k: 'high court sola ghc' },

  // ── Stadiums ────────────────────────────────────────────────────────────
  { n: 'Narendra Modi Stadium (Motera)', t: 'stadium', c: [23.0950, 72.5990], k: 'motera stadium cricket sardar patel narendra modi' },
  { n: 'EKA Arena (TransStadia)', t: 'stadium', c: [22.9970, 72.6090], k: 'transstadia kankaria arena football' },

  // ── Clubs ───────────────────────────────────────────────────────────────
  { n: 'Rajpath Club', t: 'club', c: [23.0390, 72.5085], k: 'rajpath club bodakdev sg highway' },
  { n: 'Karnavati Club', t: 'club', c: [23.0055, 72.5060], k: 'karnavati club sg highway sarkhej' },

  // ── Bridges ─────────────────────────────────────────────────────────────
  { n: 'Ellis Bridge', t: 'bridge', c: [23.0215, 72.5650], k: 'ellis bridge sangam' },
  { n: 'Nehru Bridge', t: 'bridge', c: [23.0225, 72.5680], k: 'nehru bridge ashram road' },
  { n: 'Sardar Bridge', t: 'bridge', c: [23.0290, 72.5760], k: 'sardar bridge riverfront' },
  { n: 'Subhash Bridge', t: 'bridge', c: [23.0520, 72.5760], k: 'subhash bridge gandhi' },

  // ── Neighbourhoods ──────────────────────────────────────────────────────
  { n: 'Town Hall', t: 'area', c: [23.0195, 72.5595], k: 'town hall ellisbridge' },
  { n: 'Satellite', t: 'area', c: [23.0130, 72.5150], k: 'satellite shivranjani jodhpur' },
  { n: 'Prahlad Nagar', t: 'area', c: [23.0095, 72.5095], k: 'prahladnagar corporate road' },
  { n: 'Bodakdev', t: 'area', c: [23.0380, 72.5070], k: 'bodakdev judges bunglow road' },
  { n: 'Thaltej', t: 'area', c: [23.0505, 72.5075], k: 'thaltej village' },
  { n: 'Bopal', t: 'area', c: [23.0300, 72.4670], k: 'bopal ghuma south bopal ring road' },
  { n: 'Gota', t: 'area', c: [23.1010, 72.5420], k: 'gota cross road ognaj' },
  { n: 'Chandkheda', t: 'area', c: [23.1080, 72.5880], k: 'chandkheda motera north' },
  { n: 'Motera', t: 'area', c: [23.0990, 72.5860], k: 'motera stadium area' },
  { n: 'Vastral', t: 'area', c: [22.9860, 72.6310], k: 'vastral gam east' },
  { n: 'Naroda', t: 'area', c: [23.0860, 72.6610], k: 'naroda patiya dehgam road' },
  { n: 'Nikol', t: 'area', c: [23.0710, 72.6680], k: 'nikol naroda sp ring road' },
  { n: 'Odhav', t: 'area', c: [23.0560, 72.6700], k: 'odhav gida industrial' },
  { n: 'Bapunagar', t: 'area', c: [23.0480, 72.6300], k: 'bapunagar diamond market' },
  { n: 'Maninagar', t: 'area', c: [22.9960, 72.6030], k: 'maninagar krishna baug jawahar chowk' },
  { n: 'Paldi', t: 'area', c: [23.0080, 72.5560], k: 'paldi cross road' },
  { n: 'Navrangpura', t: 'area', c: [23.0330, 72.5510], k: 'navrangpura gujarat college lawn' },
  { n: 'Old City (Khadia)', t: 'area', c: [23.0210, 72.5900], k: 'khadia old city pol walled city' },
  { n: 'Shahibaug', t: 'area', c: [23.0620, 72.5850], k: 'shahi baug shahibaug cantonment' },
  { n: 'Memnagar', t: 'area', c: [23.0480, 72.5210], k: 'memnagar gota road' },
  { n: 'Vejalpur', t: 'area', c: [23.0300, 72.5150], k: 'vejalpur jodhpur gam' },
  { n: 'Sarkhej', t: 'area', c: [22.9950, 72.5030], k: 'sarkhej cross road nh8' },
  { n: 'Juhapura', t: 'area', c: [23.0130, 72.5290], k: 'juhapura vejalpur muslim locality' },
  { n: 'Ambawadi', t: 'area', c: [23.0110, 72.5450], k: 'ambawadi elisbridge' },
  { n: 'Vasna', t: 'area', c: [23.0020, 72.5360], k: 'vasna tol naka barrack' },
  { n: 'Ramol', t: 'area', c: [23.0430, 72.6620], k: 'ramol vatva ring road' },
  { n: 'CTM Cross Road', t: 'area', c: [23.0120, 72.6340], k: 'ctm amraiwadi havmor' },
  { n: 'Shivranjani Junction', t: 'area', c: [23.0110, 72.5140], k: 'shivranjani brts cross road satellite' },
  { n: 'Lal Darwaja', t: 'market', c: [23.0245, 72.5790], k: 'lal darwaja market shopping old city' },
  { n: 'Relief Road', t: 'market', c: [23.0245, 72.5860], k: 'relief road shopping zorugate' },
  { n: 'Acropolis Mall', t: 'mall', c: [23.0290, 72.5530], k: 'acropolis mall cg road' },
  { n: 'Devarc Mall (Dev Arc)', t: 'mall', c: [23.0160, 72.5070], k: 'devarc dev arc mall sg highway' },
  { n: 'GMDC Ground', t: 'science', c: [23.0380, 72.5260], k: 'gmdc exhibition ground vastrapur gujarat' },
  { n: 'M.J. Library', t: 'monument', c: [23.0240, 72.5620], k: 'mj library mill owners ellisbridge' },
  { n: 'Patang Hotel (Revolving Restaurant)', t: 'food', c: [23.0205, 72.5728], k: 'patang revolving restaurant nehru bridge' },
  { n: 'Nagina Wadi (Kankaria)', t: 'park', c: [23.0055, 72.6030], k: 'naginawadi kankaria island summer fest' },
  { n: "Shah-e-Alam Roza", t: 'mosque', c: [23.0170, 72.5970], k: 'shah e alam dargah roza' },
  { n: 'Shreyas Foundation', t: 'education', c: [23.0030, 72.5490], k: 'shreyas museum paldi vasna' },
  { n: 'Sundarvan Nature Discovery Centre', t: 'park', c: [23.0210, 72.5200], k: 'sundarvan zoo snake park jodhpur' },
  { n: 'Gujarat Secretariat (Sachivalaya)', t: 'science', c: [23.2245, 72.6550], k: 'sachivalaya secretariat gandhinagar government vidhansabha' },
  { n: 'Gujarat College', t: 'education', c: [23.0140, 72.5600], k: 'gujarat arts science college ellisbridge' },
];
