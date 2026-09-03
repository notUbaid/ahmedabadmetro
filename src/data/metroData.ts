export interface Station {
  id: string;
  name: string;
  nameGu?: string;
  nameHi?: string;
  aliases?: string[];
  coordinates: [number, number]; // [lat, lng]
  lines: ('blue' | 'red' | 'green' | 'purple')[];
  isUnderground?: boolean;
  isInterchange?: boolean;
  isWIP?: boolean;
}

// Line colors
export const LINE_COLORS = {
  blue: '#0066CC',
  red: '#DC2626',
  green: '#16A34A',
  purple: '#9333EA',
} as const;

// All 53 operational stations across Ahmedabad and Gandhinagar
export const stations: Record<string, Station> = {
  // Blue Line (East-West) - Thaltej Gam to Vastral Gam
  thaltej_gam: { id: 'thaltej_gam', name: 'Thaltej Gam', nameGu: 'થલતેજ ગામ', nameHi: 'थलतेज गाम', coordinates: [23.0502062, 72.5070123], lines: ['blue'] },
  thaltej: { id: 'thaltej', name: 'Thaltej', nameGu: 'થલતેજ', nameHi: 'थलतेज', coordinates: [23.049748, 72.5160152], lines: ['blue'] },
  doordarshan_kendra: { id: 'doordarshan_kendra', name: 'Doordarshan Kendra', nameGu: 'દૂરદર્શન કેન્દ્ર', nameHi: 'दूरदर्शन केंद्र', coordinates: [23.0481764, 72.5244209], lines: ['blue'] },
  gurukul_road: { id: 'gurukul_road', name: 'Gurukul Road', nameGu: 'ગુરુકુલ રોડ', nameHi: 'गुरुकुल रोड', coordinates: [23.0458829, 72.5348734], lines: ['blue'] },
  gujarat_university: { id: 'gujarat_university', name: 'Gujarat University', nameGu: 'ગુજરાત યુનિવર્સિટી', nameHi: 'गुजरात यूनिवर्सिटी', coordinates: [23.0448477, 72.5435296], lines: ['blue'] },
  commerce_six_road: { id: 'commerce_six_road', name: 'Commerce Six Road', nameGu: 'કોમર્સ છ રસ્તા', nameHi: 'कॉमर्स सिक्स रोड', coordinates: [23.0407013, 72.552973], lines: ['blue'] },
  stadium: { id: 'stadium', name: 'S P Stadium', nameGu: 'સ્ટેડિયમ', nameHi: 'एस पी स्टेडियम', coordinates: [23.0398414, 72.5616768], lines: ['blue'] },
  old_high_court: { id: 'old_high_court', name: 'Old High Court', nameGu: 'જૂની હાઇ કોર્ટ', nameHi: 'ओल्ड हाई कोर्ट', coordinates: [23.0372892, 72.5672065], lines: ['blue', 'red'], isInterchange: true },
  shahpur: { id: 'shahpur', name: 'Shahpur', nameGu: 'શાહપુર', nameHi: 'शाहपुर', coordinates: [23.0392105, 72.5810327], lines: ['blue'], isUnderground: true },
  gheekanta: { id: 'gheekanta', name: 'Gheekanta', nameGu: 'ઘીકાંટા', nameHi: 'घीकांटा', coordinates: [23.028794, 72.5867752], lines: ['blue'], isUnderground: true },
  kalupur: { id: 'kalupur', name: 'Kalupur', nameGu: 'કાલુપુર', nameHi: 'कालूपुर', coordinates: [23.0246913, 72.6031447], lines: ['blue'], isUnderground: true },
  kankaria_east: { id: 'kankaria_east', name: 'Kankaria East', nameGu: 'કાંકરિયા ઈસ્ટ', nameHi: 'कांकरिया ईस्ट', coordinates: [23.0154573, 72.6070016], lines: ['blue'], isUnderground: true },
  apparel_park: { id: 'apparel_park', name: 'Apparel Park', nameGu: 'એપરલ પાર્ક', nameHi: 'अपैरल पार्क', coordinates: [23.0106696, 72.6180098], lines: ['blue'] },
  amraiwadi: { id: 'amraiwadi', name: 'Amraiwadi', nameGu: 'અમરાઈવાડી', nameHi: 'अमराईवाड़ी', coordinates: [23.0076672, 72.6287279], lines: ['blue'] },
  rabari_colony: { id: 'rabari_colony', name: 'Rabari Colony', nameGu: 'રબારી કોલોની', nameHi: 'रबारी कॉलोनी', coordinates: [23.0054703, 72.6354063], lines: ['blue'] },
  vastral: { id: 'vastral', name: 'Vastral', nameGu: 'વસ્ત્રાલ', nameHi: 'वस्त्राल', coordinates: [23.0035988, 72.6475942], lines: ['blue'] },
  nirant_cross_roads: { id: 'nirant_cross_roads', name: 'Nirant Cross Roads', nameGu: 'નિરંત ક્રોસ રોડ', nameHi: 'निरंत क्रॉस रोड', coordinates: [22.9997169, 72.658889], lines: ['blue'] },
  vastral_gam: { id: 'vastral_gam', name: 'Vastral Gam', nameGu: 'વસ્ત્રાલ ગામ', nameHi: 'वस्त्राल गाम', coordinates: [22.9971397, 72.667391], lines: ['blue'] },

  // Red Line (North-South) - APMC to Motera Stadium
  apmc: { id: 'apmc', name: 'APMC', nameGu: 'એ પી એમ સી', nameHi: 'ए पी एम सी', coordinates: [22.9977445, 72.5371222], lines: ['red'] },
  jivraj_park: { id: 'jivraj_park', name: 'Jivraj Park', nameGu: 'જીવરાજ પાર્ક', nameHi: 'जीवराज पार्क', coordinates: [23.0054989, 72.5334928], lines: ['red'] },
  rajiv_nagar: { id: 'rajiv_nagar', name: 'Rajiv Nagar', nameGu: 'રાજીવ નગર', nameHi: 'राजीव नगर', coordinates: [23.0097229, 72.5367523], lines: ['red'] },
  shreyas: { id: 'shreyas', name: 'Shreyas', nameGu: 'શ્રેયસ', nameHi: 'श्रेयस', coordinates: [23.0135977, 72.5492225], lines: ['red'] },
  paldi: { id: 'paldi', name: 'Paldi', nameGu: 'પાલડી', nameHi: 'पालडी', coordinates: [23.0185053, 72.5624076], lines: ['red'] },
  gandhigram: { id: 'gandhigram', name: 'Gandhigram', nameGu: 'ગાંધીગ્રામ', nameHi: 'गांधीग्राम', coordinates: [23.0270955, 72.5690238], lines: ['red'] },
  usmanpura: { id: 'usmanpura', name: 'Usmanpura', nameGu: 'ઉસ્માનપુરા', nameHi: 'उस्मानपुरा', coordinates: [23.0458371, 72.564982], lines: ['red'] },
  vijay_nagar: { id: 'vijay_nagar', name: 'Vijay Nagar', nameGu: 'વિજય નગર', nameHi: 'विजय नगर', coordinates: [23.0561913, 72.5623389], lines: ['red'] },
  vadaj: { id: 'vadaj', name: 'Vadaj', nameGu: 'વાડજ', nameHi: 'वाडज', coordinates: [23.0676671, 72.5657588], lines: ['red'] },
  ranip: { id: 'ranip', name: 'Ranip', nameGu: 'રાણીપ', nameHi: 'राणीप', coordinates: [23.0676741, 72.5740838], lines: ['red'] },
  aec: { id: 'aec', name: 'AEC', nameGu: 'એ ઇ સી', nameHi: 'ए ई सी', coordinates: [23.0751088, 72.593291], lines: ['red'] },
  sabarmati: { id: 'sabarmati', name: 'Sabarmati', nameGu: 'સાબરમતી', nameHi: 'साबरमती', coordinates: [23.0856303, 72.592206], lines: ['red'] },
  motera_stadium: { id: 'motera_stadium', name: 'Motera Stadium', nameGu: 'મોટેરા સ્ટેડિયમ', nameHi: 'मोटेरा स्टेडियम', coordinates: [23.0967726, 72.596692], lines: ['red'] },
  koteshwar_road: { id: 'koteshwar_road', name: 'Koteshwar Road', nameGu: 'કોટેશ્વર રોડ', nameHi: 'कोटेश्वर रोड', coordinates: [23.1031114, 72.6021329], lines: ['red', 'green'], isInterchange: true },

  // Green Line - Koteshwar Road to Mahatma Mandir (GNLU branch)
  vishwakarma_college: { id: 'vishwakarma_college', name: 'Vishwakarma College', nameGu: 'વિશ્વકર્મા કોલેજ', nameHi: 'विश्वकर्मा कॉलेज', coordinates: [23.1141999, 72.6083864], lines: ['green'] },
  tapovan_circle: { id: 'tapovan_circle', name: 'Tapovan Circle', nameGu: 'તપોવન સર્કલ', nameHi: 'तपोवन सर्कल', coordinates: [23.1201271, 72.6157987], lines: ['green'] },
  narmada_canal: { id: 'narmada_canal', name: 'Narmada Canal', nameGu: 'નર્મદા કેનાલ', nameHi: 'नर्मदा कैनाल', coordinates: [23.1251457, 72.6220979], lines: ['green'] },
  koba_circle: { id: 'koba_circle', name: 'Koba Circle', nameGu: 'કોબા સર્કલ', nameHi: 'कोबा सर्कल', coordinates: [23.1322508, 72.631042], lines: ['green'] },
  juna_koba: { id: 'juna_koba', name: 'Juna Koba', nameGu: 'જૂના કોબા', nameHi: 'जूना कोबा', coordinates: [23.1419718, 72.6386122], lines: ['green'] },
  koba_gam: { id: 'koba_gam', name: 'Koba Gam', nameGu: 'કોબા ગામ', nameHi: 'कोबा गाम', coordinates: [23.1476098, 72.6439055], lines: ['green'] },
  gnlu: { id: 'gnlu', name: 'GNLU', nameGu: 'જી એન એલ યુ', nameHi: 'जी एन एल यू', coordinates: [23.1544724, 72.6474689], lines: ['green', 'purple'], isInterchange: true },
  raysan: { id: 'raysan', name: 'Raysan', nameGu: 'રાયસન', nameHi: 'रायसन', coordinates: [23.1663954, 72.6483252], lines: ['green'] },
  randesan: { id: 'randesan', name: 'Randesan', nameGu: 'રાંદેસણ', nameHi: 'रांदेसण', coordinates: [23.1790845, 72.6472905], lines: ['green'] },
  dholakuva_circle: { id: 'dholakuva_circle', name: 'Dholakuva Circle', nameGu: 'ધોળાકુવા સર્કલ', nameHi: 'धोलाकुवा सर्कल', coordinates: [23.1859445, 72.6433202], lines: ['green'] },
  infocity: { id: 'infocity', name: 'Infocity', nameGu: 'ઇન્ફોસિટી', nameHi: 'इन्फोसिटी', coordinates: [23.1922574, 72.6397126], lines: ['green'] },
  sector_1: { id: 'sector_1', name: 'Sector-1', nameGu: 'સેક્ટર-1', nameHi: 'सेक्टर-1', coordinates: [23.2049077, 72.6431519], lines: ['green'] },
  sector_10a: { id: 'sector_10a', name: 'Sector-10A', nameGu: 'સેક્ટર-10એ', nameHi: 'सेक्टर-10ए', coordinates: [23.2114841, 72.6501927], lines: ['green'] },
  sachivalaya: { id: 'sachivalaya', name: 'Sachivalaya', nameGu: 'સચિવાલય', nameHi: 'सचिवालय', coordinates: [23.2150688, 72.6587511], lines: ['green'] },

  // New Green Line Extension (Sachivalaya to Mahatma Mandir)
  akshardham: { id: 'akshardham', name: 'Akshardham', nameGu: 'અક્ષરધામ', nameHi: 'अक्षरधाम', coordinates: [23.2236772, 72.6641817], lines: ['green'] },
  juna_sachivalaya: { id: 'juna_sachivalaya', name: 'Juna Sachivalaya', nameGu: 'જૂના સચિવાલય', nameHi: 'जूना सचिवालय', coordinates: [23.228926, 72.6594151], lines: ['green'] },
  sector_16: { id: 'sector_16', name: 'Sector 16', nameGu: 'સેક્ટર-16', nameHi: 'सेक्टर-16', coordinates: [23.2338826, 72.6501659], lines: ['green'] },
  sector_24: { id: 'sector_24', name: 'Sector 24', nameGu: 'સેક્ટર-24', nameHi: 'सेक्टर-24', coordinates: [23.2385075, 72.6414782], lines: ['green'] },
  mahatma_mandir: { id: 'mahatma_mandir', name: 'Mahatma Mandir', nameGu: 'મહાત્મા મંદિર', nameHi: 'महात्मा मंदिर', coordinates: [23.2339412, 72.6338714], lines: ['green'] },

  // Purple Line (GNLU to GIFT City)
  pdpu: {
    id: 'pdpu',
    name: 'PDEU',
    nameGu: 'પી ડી ઈ યુ',
    nameHi: 'पी डी ई यू',
    aliases: ['PDPU', 'Pandit Deendayal Petroleum University', 'Pandit Deendayal Energy University', 'પી ડી પી યુ', 'पी डी पी यू'],
    coordinates: [23.1548645, 72.6612117],
    lines: ['purple']
  },
  gift_city: { id: 'gift_city', name: 'GIFT City', nameGu: 'ગિફ્ટ સિટી', nameHi: 'गिफ्ट सिटी', coordinates: [23.1533555, 72.6855536], lines: ['purple'] },
};
