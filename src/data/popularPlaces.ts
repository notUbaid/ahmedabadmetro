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
  /** Designated nearest metro station ID */
  s?: string;
}

export const popularPlaces: PopularPlace[] = [
  // ── Heritage & Monuments ────────────────────────────────────────────────
  { n: 'Sabarmati Ashram', t: 'monument', c: [23.0585, 72.5798], k: 'gandhi ashram gandhi smarak sabarmati hriday kunj' },
  { n: 'Sabarmati Riverfront', t: 'monument', c: [23.0430, 72.5690], k: 'river front nadi walkway promenade' },
  { n: 'Atal Pedestrian Bridge', t: 'bridge', c: [23.0230, 72.5730], k: 'atal bridge foot over bridge sabarmati riverfront' },
  { n: 'Riverfront Flower Park & Event Centre', t: 'park', c: [23.0180, 72.5700], k: 'flower park flower show sabarmati riverfront paldi event ground' },
  { n: 'Manek Chowk', t: 'market', c: [23.0225, 72.5720], k: 'manek chowk night food market old city khau gali' },
  { n: 'Rani no Hajiro', t: 'monument', c: [23.0232, 72.5845], k: 'rani no hajiro mughalai old city' },
  { n: 'Jama Masjid', t: 'mosque', c: [23.0233, 72.5837], k: 'jama masjid jumma mosque old city' },
  { n: 'Teen Darwaja', t: 'monument', c: [23.0240, 72.5850], k: 'teen darwaza gate bhadra' },
  { n: 'Bhadra Fort', t: 'monument', c: [23.0250, 72.5848], k: 'bhadra fort bhadra kali maidan lal darwaja' },
  { n: 'Sidi Saiyyed Mosque', t: 'mosque', c: [23.0252, 72.5810], k: 'sidi saiyyed jali sidi sayed mosque stone lattice' },
  { n: 'Hutheesing Jain Temple', t: 'temple', c: [23.0390, 72.5940], k: 'hathi singh jain derasar shahibaug' },
  { n: 'Dada Hari ni Vav', t: 'monument', c: [23.0400, 72.6000], k: 'dada hari stepwell vav asarva asarwa' },
  { n: 'Sidi Bashir Mosque (Shaking Minarets)', t: 'monument', c: [23.0010, 72.5950], k: 'shaking minarets jhulta minara sarangpur railway' },
  { n: 'Sarkhej Roza', t: 'monument', c: [23.0080, 72.5050], k: 'sarkhej roza makbara tomb sufi monument' },
  { n: 'Adalaj Stepwell (Adalaj ni Vav)', t: 'monument', c: [23.1653, 72.5808], k: 'adalaj ni vav adalaj step well rudabai heritage gandhinagar' },
  { n: 'Calico Museum of Textiles', t: 'museum', c: [23.0380, 72.5900], k: 'calico textile museum shahibaug sarabhai' },
  { n: 'Sardar Vallabhbhai Patel National Memorial', t: 'museum', c: [23.0605, 72.5855], k: 'moti shahi mahal patel memorial shahibaug' },
  { n: 'Lalbhai Dalpatbhai Museum', t: 'museum', c: [23.0365, 72.5445], k: 'ld museum navrangpura art sculpture' },
  { n: 'Dandi Kutir Museum', t: 'museum', c: [23.2440, 72.6480], k: 'dandi kutir salt mound gandhi museum gandhinagar mahatma mandir exhibition' , s: 'mahatma_mandir' },

  // ── Gandhinagar Government & Convention Hubs ──────────────────────────────
  { n: 'The Helipad Exhibition Centre', t: 'science', c: [23.2378, 72.6395], k: 'helipad exhibition ground centre vibrant gujarat defexpo sector 17 gandhinagar trade fair convention ground' , s: 'mahatma_mandir' },
  { n: 'Mahatma Mandir Convention Centre', t: 'science', c: [23.2455, 72.6485], k: 'mahatma mandir convention gandhinagar exhibition vibrant gujarat sector 13 14' },
  { n: 'Swarnim Sankul (CM Office & Cabinet)', t: 'science', c: [23.2240, 72.6570], k: 'swarnim sankul cmo cm office ministers cabinet new sachivalaya secretariat vidhansabha' , s: 'sachivalaya' },
  { n: 'Gujarat Vidhan Sabha (Legislative Assembly)', t: 'monument', c: [23.2250, 72.6560], k: 'vidhan sabha legislative assembly vithalbhai patel bhavan sachivalaya gandhinagar' , s: 'sachivalaya' },
  { n: 'Gujarat Secretariat (Sachivalaya)', t: 'science', c: [23.2245, 72.6550], k: 'sachivalaya secretariat gandhinagar government vidhansabha ministry' },

  // ── Temples ─────────────────────────────────────────────────────────────
  { n: 'Akshardham Temple Gandhinagar', t: 'temple', c: [23.2296, 72.6655], k: 'akshardham swaminarayan mandir gandhinagar sector 20' },
  { n: 'Akshardham Water Show (Sat-Chit-Anand)', t: 'science', c: [23.2295, 72.6650], k: 'akshardham water show laser show sat chit anand swaminarayan sector 20 gandhinagar' , s: 'akshardham' },
  { n: 'Swaminarayan Dham (Koba Circle)', t: 'temple', c: [23.1460, 72.6270], k: 'swaminarayan dham koba circle mandir ashram highway' },
  { n: 'Swaminarayan Temple Kalupur', t: 'temple', c: [23.0290, 72.6020], k: 'swaminarayan mandir kalupur heritage temple' },
  { n: 'ISKCON Temple Ahmedabad', t: 'temple', c: [23.0175, 72.5115], k: 'iskcon radha govinda mandir sg highway satellite' },
  { n: 'Jagannath Temple Jamalpur', t: 'temple', c: [22.9925, 72.5855], k: 'jagannath mandir rathyatra jamalpur' },
  { n: 'Camp Hanuman Temple', t: 'temple', c: [23.0655, 72.5810], k: 'camp hanuman shahibaug cantonment military' },
  { n: 'Vaishnodevi Temple', t: 'temple', c: [23.1285, 72.5445], k: 'vaishnodevi temple mandir sg highway circle khodiyar' },

  // ── Malls & Markets ─────────────────────────────────────────────────────
  { n: 'Ahmedabad One Mall (Alpha One)', t: 'mall', c: [23.0400, 72.5240], k: 'alpha one mall vastrapur shopping cinema cinepolis' },
  { n: 'Palladium Mall & Phoenix Marketcity', t: 'mall', c: [23.0355, 72.5075], k: 'palladium sg highway ahmedabad mall phoenix market city luxury' },
  { n: 'Iscon Mega Mall', t: 'mall', c: [23.0225, 72.5115], k: 'iscon mega mall sg highway satellite' },
  { n: 'Himalaya Mall', t: 'mall', c: [23.0450, 72.5100], k: 'himalaya mall drive in road multiplex' },
  { n: 'Titanium City Centre', t: 'mall', c: [23.0130, 72.5130], k: 'titanium city centre mall satellite shivranjani' },
  { n: 'Municipal Market', t: 'market', c: [23.0325, 72.5525], k: 'municipal market navrangpura cg road street shopping' },
  { n: 'Law Garden Night Market', t: 'market', c: [23.0256, 72.5589], k: 'law garden night market choker bazaar chaniya choli' },
  { n: 'Ravivari (Gujari Bazaar)', t: 'market', c: [23.0220, 72.5750], k: 'ravivari gujari sunday flea market riverfront' },
  { n: 'C.G. Road', t: 'market', c: [23.0280, 72.5560], k: 'cg road char rasta shopping navrangpura fashion' },
  { n: 'Lal Darwaja Market', t: 'market', c: [23.0245, 72.5790], k: 'lal darwaja market shopping old city clothes' },
  { n: 'Relief Road', t: 'market', c: [23.0245, 72.5860], k: 'relief road shopping electronics wholesale' },
  { n: 'Sector 21 Market Gandhinagar', t: 'market', c: [23.2380, 72.6530], k: 'sector 21 shopping centre market shopping street gandhinagar' , s: 'sector_16' },
  { n: 'Acropolis Mall', t: 'mall', c: [23.0290, 72.5530], k: 'acropolis mall cg road' },
  { n: 'Devarc Mall (Dev Arc)', t: 'mall', c: [23.0160, 72.5070], k: 'devarc dev arc mall sg highway' },

  // ── Food Streets & Dining ────────────────────────────────────────────────
  { n: 'Sindhu Bhavan Road (SBR)', t: 'food', c: [23.0335, 72.4850], k: 'sbr sindhu bhavan restaurants cafes food bodakdev' },
  { n: 'Patang Hotel (Revolving Restaurant)', t: 'food', c: [23.0205, 72.5728], k: 'patang revolving restaurant nehru bridge riverfront' },

  // ── Parks & Lakes ───────────────────────────────────────────────────────
  { n: 'Kankaria Lakefront', t: 'lake', c: [23.0060, 72.6035], k: 'kankariya kankaria talav front amusement balloon safari' },
  { n: 'Kamla Nehru Zoo', t: 'park', c: [23.0055, 72.6060], k: 'zoo ahmedabad kankaria zoo animals' },
  { n: 'Nagina Wadi (Kankaria)', t: 'park', c: [23.0055, 72.6030], k: 'naginawadi kankaria island musical fountain' },
  { n: 'Law Garden', t: 'park', c: [23.0256, 72.5589], k: 'law garden ellisbridge green park' },
  { n: 'Parimal Garden', t: 'park', c: [23.0213, 72.5566], k: 'parimal gardan ellisbridge pond walking track' },
  { n: 'Vastrapur Lake', t: 'lake', c: [23.0355, 72.5295], k: 'vastralpur talav vastrapur lake open theater' },
  { n: 'Prahlad Nagar Garden', t: 'park', c: [23.0105, 72.5080], k: 'prahladnagar garden jog park' },
  { n: 'Indroda Nature Park (Dinosaur Park)', t: 'park', c: [23.2020, 72.6355], k: 'indroda dinosaur fossil park zoo gandhinagar geer foundation' },
  { n: 'Sarita Udyan', t: 'park', c: [23.2160, 72.6540], k: 'sarita udyan gandhinagar riverfront garden' },
  { n: 'Punit Van', t: 'park', c: [23.2240, 72.6390], k: 'punit van botanical garden gandhinagar' },
  { n: 'Narmada Canal Walkway', t: 'park', c: [23.1251, 72.6220], k: 'narmada canal viewpoint picnic spot gandhinagar walkway bridge' },
  { n: 'Randesan Urban Forest', t: 'park', c: [23.1680, 72.6450], k: 'randesan urban forest bird sanctuary riverfront gandhinagar' },
  { n: 'Sundarvan Nature Discovery Centre', t: 'park', c: [23.0210, 72.5200], k: 'sundarvan zoo snake park jodhpur satellite nature' },

  // ── Science, Technology & IT Parks ──────────────────────────────────────
  { n: 'Gujarat Science City', t: 'science', c: [23.0765, 72.5110], k: 'science city hebatpur planetarium aquatic gallery robotics imax' },
  { n: 'GIFT City (Fintech Hub)', t: 'science', c: [23.1595, 72.6845], k: 'gift city gujarat international finance tec ifsc exchange' },
  { n: 'GIFT Diamond Tower & WTC', t: 'science', c: [23.1595, 72.6845], k: 'gift city diamond tower wtc world trade center ifsc stock exchange fin tech' , s: 'gift_city' },
  { n: 'Infocity IT Park', t: 'science', c: [23.1897, 72.6295], k: 'info city gandhinagar it park software hub tech' },
  { n: 'TCS Garima Park', t: 'science', c: [23.1905, 72.6255], k: 'tcs garima park tata consultancy services infocity it software sector 9 gandhinagar' , s: 'infocity' },
  { n: 'GMDC Ground', t: 'science', c: [23.0380, 72.5260], k: 'gmdc exhibition ground vastrapur gujarat trade expo' },

  // ── Transport Hubs ──────────────────────────────────────────────────────
  { n: 'Sardar Vallabhbhai Patel International Airport (SVPIA)', t: 'transport', c: [23.0780, 72.6256], k: 'ahmedabad airport svpi hansol domestic international terminal 1 terminal 2 flight' },
  { n: 'Ahmedabad Junction Railway Station (Kalupur)', t: 'transport', c: [23.0259, 72.6009], k: 'kalupur railway station adI junction train station platform' },
  { n: 'Sabarmati Bullet Train Terminal (HSR)', t: 'transport', c: [23.0780, 72.5850], k: 'bullet train high speed rail terminal sabarmati multimodal transport hub mahsr' , s: 'sabarmati' },
  { n: 'Sabarmati Railway Station', t: 'transport', c: [23.0700, 72.5820], k: 'sabarmati station train junction' },
  { n: 'Gandhinagar Capital Railway Station (The Leela)', t: 'transport', c: [23.2345, 72.6430], k: 'gnc gandhinagar capital station train the leela hotel station five star' },
  { n: 'Geeta Mandir Bus Stand (GSRTC Central)', t: 'transport', c: [23.0105, 72.5725], k: 'central bus station gsrtc geeta mandir st depot bus terminal' },
  { n: 'Ranip Bus Terminal (GSRTC Sub-Terminal)', t: 'transport', c: [23.0680, 72.5750], k: 'ranip bus stand gsrtc terminal rto circle' },
  { n: 'Maninagar Railway Station', t: 'transport', c: [22.9960, 72.6050], k: 'maninagar station train' },
  { n: 'Asarva Railway Station', t: 'transport', c: [23.0435, 72.6005], k: 'asarwa station train' },

  // ── Education & Research ────────────────────────────────────────────────
  { n: 'IIT Gandhinagar (IITGN)', t: 'education', c: [23.2114, 72.6841], k: 'iit gandhinagar iitgn indian institute technology palaj chiloda campus engineering palaj' , s: 'gnlu' },
  { n: 'IIM Ahmedabad (IIMA)', t: 'education', c: [23.0326, 72.5355], k: 'indian institute management iima vastrapur business school b-school' },
  { n: 'DA-IICT (Dhirubhai Ambani Institute)', t: 'education', c: [23.1885, 72.6285], k: 'daiict da iict dhirubhai ambani institute infocity sector 9 tech engineering' , s: 'infocity' },
  { n: 'NIFT Gandhinagar', t: 'education', c: [23.1925, 72.6245], k: 'nift national institute fashion technology infocity sector 10b gandhinagar' , s: 'infocity' },
  { n: 'Gujarat National Law University (GNLU)', t: 'education', c: [23.1535, 72.6580], k: 'gnlu national law university attalika avenue koba knowledge corridor' , s: 'gnlu' },
  { n: 'National Forensic Sciences University (NFSU)', t: 'education', c: [23.2270, 72.6465], k: 'nfsu gfsu forensic science university sector 9 gandhinagar' , s: 'sector_10a' },
  { n: 'Pandit Deendayal Energy University (PDEU / PDPU)', t: 'education', c: [23.1550, 72.6610], k: 'pdpu pdeu gandhinagar raysan petroleum university energy' },
  { n: 'National Institute of Design (NID)', t: 'education', c: [23.0075, 72.5540], k: 'nid paldi design school campus' },
  { n: 'LD College of Engineering (LDCE)', t: 'education', c: [23.0335, 72.5460], k: 'ldce ld engineering college navrangpura gujarat university' },
  { n: 'CEPT University', t: 'education', c: [23.0348, 72.5505], k: 'cept architecture navrangpura university planning design' },
  { n: 'Gujarat University', t: 'education', c: [23.0355, 72.5430], k: 'gujarat university navrangpura campus gu' },
  { n: 'Gujarat Technological University (GTU)', t: 'education', c: [23.1065, 72.5900], k: 'gtu chandkheda university technical engineering' },
  { n: 'Vishwakarma Govt Engineering College (VGEC)', t: 'education', c: [23.1142, 72.6084], k: 'vgec vishwakarma college engineering chandkheda' },
  { n: 'Nirma University', t: 'education', c: [23.1575, 72.4955], k: 'nirma institute technology sg highway chharodi' },
  { n: 'Silver Oak University', t: 'education', c: [23.1070, 72.5430], k: 'silver oak university college gota engineering tech' },
  { n: 'Ahmedabad Management Association (AMA) & ATIRA', t: 'education', c: [23.0305, 72.5390], k: 'ama atira ahmedabad management association vastrapur iim road textile research' },
  { n: 'Gujarat Vidyapith', t: 'education', c: [23.0445, 72.5545], k: 'gujarat vidyapith ashram road university gandhian' },
  { n: "St. Xavier's College", t: 'education', c: [23.0330, 72.5480], k: 'st xavier college navrangpura' },
  { n: 'Gujarat College', t: 'education', c: [23.0140, 72.5600], k: 'gujarat arts science college ellisbridge' },
  { n: 'Physical Research Laboratory (PRL)', t: 'research', c: [23.0350, 72.5440], k: 'prl navrangpura space research institute isro' },
  { n: 'Space Applications Centre (ISRO SAC)', t: 'research', c: [23.0230, 72.5380], k: 'isro sac jodhpur tekra satellite communication bopal' },

  // ── Hospitals & Healthcare ───────────────────────────────────────────────
  { n: 'Civil Hospital Ahmedabad & BJ Medical', t: 'hospital', c: [23.0440, 72.5905], k: 'civil hospital asarwa bj medical college government hospital' },
  { n: 'U.N. Mehta Institute of Cardiology', t: 'hospital', c: [23.0450, 72.5910], k: 'un mehta heart civil hospital asarwa cardiology institute cardiac' },
  { n: 'Gujarat Cancer & Research Institute (GCRI)', t: 'hospital', c: [23.0435, 72.5920], k: 'gcri cancer hospital civil asarwa mp shah oncology' },
  { n: 'KD Hospital (Kalyan Diabetic Hospital)', t: 'hospital', c: [23.1250, 72.5440], k: 'kd hospital kalyan diabetes sg highway vaishnodevi multispeciality' },
  { n: 'Apollo Hospitals International', t: 'hospital', c: [23.1110, 72.6170], k: 'apollo hospital bhat gandhinagar ahmedabad airport road multispecialty' },
  { n: 'Zydus Hospital', t: 'hospital', c: [23.0810, 72.5080], k: 'zydus sola bhailal amin sg highway hebatpur road' },
  { n: 'CIMS Hospital (Marengo CIMS)', t: 'hospital', c: [23.0720, 72.5180], k: 'cims hospital marengo science city road sola cardiology' },
  { n: 'Sterling Hospital', t: 'hospital', c: [23.0480, 72.5310], k: 'sterling hospital gurukul road memnagar multispecialty' },
  { n: 'SAL Hospital & Medical Institute', t: 'hospital', c: [23.0520, 72.5200], k: 'sal hospital doordarshan kendra drive in thaltej surgery' },
  { n: 'Shalby Hospital (SG Highway)', t: 'hospital', c: [23.0125, 72.5060], k: 'shalby multi specialty sg highway orthopedic knee replacement' },
  { n: 'Gandhinagar Civil Hospital (GMERS)', t: 'hospital', c: [23.2200, 72.6450], k: 'gmers medical college civil hospital gandhinagar sector 12' },
  { n: 'Gujarat High Court', t: 'research', c: [23.0855, 72.5075], k: 'high court sola ghc judicial legal' },

  // ── Stadiums & Arenas ───────────────────────────────────────────────────
  { n: 'Narendra Modi Stadium (Motera)', t: 'stadium', c: [23.0924, 72.5975], k: 'narendra modi stadium motera cricket stadium sardar patel ipl match bcci world cup' , s: 'motera_stadium' },
  { n: 'EKA Arena (TransStadia)', t: 'stadium', c: [22.9970, 72.6090], k: 'transstadia kankaria arena football indoor stadium sports' },
  { n: 'Sardar Patel Stadium (Navrangpura)', t: 'stadium', c: [23.0398, 72.5616], k: 'sp stadium sardar patel stadium navrangpura sports club' },

  // ── Clubs & Resorts ─────────────────────────────────────────────────────
  { n: 'GIFT City Club & Grand Mercure', t: 'club', c: [23.1610, 72.6850], k: 'gift city club grand mercure hotel resort gandhinagar ifsc' , s: 'gift_city' },
  { n: 'Infocity Club & Resort', t: 'club', c: [23.1930, 72.6320], k: 'infocity club resort sector 9 gandhinagar swimming banquet' },
  { n: 'Rajpath Club', t: 'club', c: [23.0390, 72.5085], k: 'rajpath club bodakdev sg highway recreational' },
  { n: 'Karnavati Club', t: 'club', c: [23.0055, 72.5060], k: 'karnavati club sg highway sarkhej lifestyle' },

  // ── Bridges ─────────────────────────────────────────────────────────────
  { n: 'Ellis Bridge', t: 'bridge', c: [23.0215, 72.5650], k: 'ellis bridge heritage riverfront' },
  { n: 'Nehru Bridge', t: 'bridge', c: [23.0225, 72.5680], k: 'nehru bridge ashram road' },
  { n: 'Sardar Bridge', t: 'bridge', c: [23.0290, 72.5760], k: 'sardar bridge riverfront' },
  { n: 'Subhash Bridge', t: 'bridge', c: [23.0520, 72.5760], k: 'subhash bridge gandhi rto' },

  // ── Key Neighbourhoods ──────────────────────────────────────────────────
  { n: 'Infocity Gandhinagar', t: 'area', c: [23.1922, 72.6397], k: 'infocity sector 9 tech hub gandhinagar' },
  { n: 'GIFT City Gandhinagar', t: 'area', c: [23.1550, 72.6850], k: 'gift city fintech ifsc gandhinagar' },
  { n: 'Town Hall', t: 'area', c: [23.0195, 72.5595], k: 'town hall ellisbridge' },
  { n: 'Satellite', t: 'area', c: [23.0130, 72.5150], k: 'satellite shivranjani jodhpur' },
  { n: 'Prahlad Nagar', t: 'area', c: [23.0095, 72.5095], k: 'prahladnagar corporate road corporate park' },
  { n: 'Bodakdev', t: 'area', c: [23.0380, 72.5070], k: 'bodakdev judges bunglow road' },
  { n: 'Thaltej', t: 'area', c: [23.0505, 72.5075], k: 'thaltej village drive in' },
  { n: 'Bopal', t: 'area', c: [23.0300, 72.4670], k: 'bopal ghuma south bopal ring road' },
  { n: 'Gota', t: 'area', c: [23.1010, 72.5420], k: 'gota cross road ognaj sg highway' },
  { n: 'Chandkheda', t: 'area', c: [23.1080, 72.5880], k: 'chandkheda motera north' },
  { n: 'Motera', t: 'area', c: [23.0990, 72.5860], k: 'motera stadium area sabarmati' },
  { n: 'Vastral', t: 'area', c: [22.9860, 72.6310], k: 'vastral gam east ring road' },
  { n: 'Naroda', t: 'area', c: [23.0860, 72.6610], k: 'naroda patiya dehgam road' },
  { n: 'Nikol', t: 'area', c: [23.0710, 72.6680], k: 'nikol naroda sp ring road' },
  { n: 'Maninagar', t: 'area', c: [22.9960, 72.6030], k: 'maninagar krishna baug jawahar chowk' },
  { n: 'Paldi', t: 'area', c: [23.0080, 72.5560], k: 'paldi cross road bhatta' },
  { n: 'Navrangpura', t: 'area', c: [23.0330, 72.5510], k: 'navrangpura commerce six road' },
  { n: 'Shahibaug', t: 'area', c: [23.0620, 72.5850], k: 'shahi baug shahibaug cantonment circuit house' },
  { n: 'Vejalpur', t: 'area', c: [23.0300, 72.5150], k: 'vejalpur jodhpur gam bakeri city' },
  { n: 'Sarkhej', t: 'area', c: [22.9950, 72.5030], k: 'sarkhej cross road nh8 sanand highway' },
  { n: 'Juhapura', t: 'area', c: [23.0130, 72.5290], k: 'juhapura vejalpur muslim locality' },
  { n: 'Ambawadi', t: 'area', c: [23.0110, 72.5450], k: 'ambawadi elisbridge polytechnic' },
  { n: 'Vasna', t: 'area', c: [23.0020, 72.5360], k: 'vasna barrage apmc' },
];
