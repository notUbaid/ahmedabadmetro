import { Station } from '@/data/metroData';

export type Language = 'en' | 'gu' | 'hi';

const translations = {
  en: {
    // General
    'app.title': 'Ahmedabad Metro',
    'common.ok': 'OK',
    'common.close': 'Close',
    'common.search': 'Search stations...',
    'common.from': 'From station...',
    'common.to': 'To station...',
    
    // Bottom Panel
    'panel.planRoute': 'Plan Route',
    'panel.directions': 'Directions',
    'panel.nearestStation': 'Nearest Station',
    'panel.walk': 'walk',
    'panel.interchange': 'Interchange',

    // Route Planner
    'route.planJourney': 'Plan Your Journey',
    'route.coordinateFriend': 'Coordinate with Friend',
    'route.outsideHours': 'Outside Operating Hours',
    'route.outsideHoursDesc': 'Service hours are 6:20 AM - 11:00 PM (Ahmedabad) and 6:20 AM - 10:00 PM (Gandhinagar). Routes shown now are estimated for tomorrow morning.',
    'route.syncing': 'Syncing with Friend\'s Journey',
    'route.exitSync': 'Exit Sync',
    'route.travelTogetherFor': 'Travel Together For',
    'route.stops': 'stops',
    'route.synced': 'Synced',
    'route.cannotReach': 'You cannot reach the shared metro in time from this origin. Try a closer station.',
    'route.interchangeStations': 'Interchange Stations',
    'route.board': 'Board',
    'route.line': 'LINE',
    'route.directMetro': 'Direct Metro',
    'route.station': 'station',
    'route.stations': 'stations',
    'route.changeTo': 'Change to',
    'route.arriveAt': 'Arrive at',
    'route.wait': 'wait',
    'route.hurry': 'Hurry!',
    'route.takeBus': 'Take Bus to',
    'route.busDesc': 'Bus stop is just below the metro station. Buses run frequently.',
    'route.fasterThanMetro': 'Faster than waiting for metro',
    'route.exitHere': 'Exit here',

    // Commute Card
    'commute.dailyCommute': 'Daily Commute',
    'commute.walkTo': 'walk to',
    'commute.every': 'every',
    'commute.min': 'min',
    'commute.now': 'Now',
    'commute.noUpcoming': 'No upcoming direct Metros to {station} right now',
    'commute.reaches': 'reaches',
    'commute.via': 'via',
    'commute.changes': 'changes',
    'commute.direct': 'direct',

    // Side Menu
    'menu.language': 'Language',
    'menu.english': 'English',
    'menu.gujarati': 'ગુજરાતી',
    'menu.hindi': 'हिंदी',
  },
  gu: {
    // General
    'app.title': 'અમદાવાદ મેટ્રો',
    'common.ok': 'બરાબર',
    'common.close': 'બંધ કરો',
    'common.search': 'સ્ટેશન શોધો...',
    'common.from': 'ક્યાંથી...',
    'common.to': 'ક્યાં સુધી...',
    
    // Bottom Panel
    'panel.planRoute': 'રૂટ પ્લાન કરો',
    'panel.directions': 'દિશાઓ',
    'panel.nearestStation': 'નજીકનું સ્ટેશન',
    'panel.walk': 'ચાલીને',
    'panel.interchange': 'ઇન્ટરચેન્જ',

    // Route Planner
    'route.planJourney': 'તમારી યાત્રા પ્લાન કરો',
    'route.coordinateFriend': 'મિત્ર સાથે સમન્વય કરો',
    'route.outsideHours': 'કામકાજના કલાકોની બહાર',
    'route.outsideHoursDesc': 'સેવાનો સમય સવારે 6:20 થી રાત્રે 11:00 (અમદાવાદ) અને સવારે 6:20 થી રાત્રે 10:00 (ગાંધીનગર) છે. હવે દર્શાવેલ રૂટ આવતી કાલ સવાર માટે અંદાજિત છે.',
    'route.syncing': 'મિત્રની યાત્રા સાથે સમન્વય',
    'route.exitSync': 'સમન્વય બંધ કરો',
    'route.travelTogetherFor': 'સાથે મુસાફરી કરો',
    'route.stops': 'સ્ટેશનો',
    'route.synced': 'સમન્વયિત',
    'route.cannotReach': 'તમે આ સ્ટેશનથી સમયસર મેટ્રો પકડી શકશો નહીં. નજીકના સ્ટેશનથી પ્રયાસ કરો.',
    'route.interchangeStations': 'ઇન્ટરચેન્જ સ્ટેશનો',
    'route.board': 'બોર્ડ',
    'route.line': 'લાઇન',
    'route.directMetro': 'ડાયરેક્ટ મેટ્રો',
    'route.station': 'સ્ટેશન',
    'route.stations': 'સ્ટેશનો',
    'route.changeTo': 'અહીં બદલો',
    'route.arriveAt': 'પહોંચવાનો સમય',
    'route.wait': 'રાહ જુઓ',
    'route.hurry': 'ઉતાવળ કરો!',
    'route.takeBus': 'બસ પકડો',
    'route.busDesc': 'બસ સ્ટોપ મેટ્રો સ્ટેશનની બરાબર નીચે છે. બસો વારંવાર દોડે છે.',
    'route.fasterThanMetro': 'મેટ્રોની રાહ જોવા કરતાં ઝડપી',
    'route.exitHere': 'અહીં બહાર નીકળો',

    // Commute Card
    'commute.dailyCommute': 'દૈનિક મુસાફરી',
    'commute.walkTo': 'સુધી ચાલીને',
    'commute.every': 'દર',
    'commute.min': 'મિનિટ',
    'commute.now': 'હમણાં',
    'commute.noUpcoming': 'અત્યારે {station} માટે કોઈ સીધી મેટ્રો નથી',
    'commute.reaches': 'પહોંચે છે',
    'commute.via': 'દ્વારા',
    'commute.changes': 'બદલાવ',
    'commute.direct': 'સીધી',

    // Side Menu
    'menu.language': 'ભાષા',
    'menu.english': 'English',
    'menu.gujarati': 'ગુજરાતી',
    'menu.hindi': 'हिंदी',
  },
  hi: {
    // General
    'app.title': 'अहमदाबाद मेट्रो',
    'common.ok': 'ठीक है',
    'common.close': 'बंद करें',
    'common.search': 'स्टेशन खोजें...',
    'common.from': 'कहाँ से...',
    'common.to': 'कहाँ तक...',
    
    // Bottom Panel
    'panel.planRoute': 'मार्ग खोजें',
    'panel.directions': 'दिशा-निर्देश',
    'panel.nearestStation': 'निकटतम स्टेशन',
    'panel.walk': 'चलकर',
    'panel.interchange': 'इंटरचेंज',

    // Route Planner
    'route.planJourney': 'अपनी यात्रा की योजना बनाएं',
    'route.coordinateFriend': 'मित्र के साथ समन्वय करें',
    'route.outsideHours': 'कामकाजी घंटों के बाहर',
    'route.outsideHoursDesc': 'सेवा का समय सुबह 6:20 से रात 11:00 (अहमदाबाद) और सुबह 6:20 से रात 10:00 (गांधीनगर) है। अब दिखाए गए मार्ग कल सुबह के लिए अनुमानित हैं।',
    'route.syncing': 'मित्र की यात्रा के साथ समन्वय',
    'route.exitSync': 'समन्वय से बाहर निकलें',
    'route.travelTogetherFor': 'साथ में यात्रा करें',
    'route.stops': 'स्टेशन',
    'route.synced': 'समन्वयित',
    'route.cannotReach': 'आप इस स्टेशन से समय पर मेट्रो नहीं पकड़ पाएंगे। किसी नज़दीकी स्टेशन से प्रयास करें।',
    'route.interchangeStations': 'इंटरचेंज स्टेशन',
    'route.board': 'बोर्ड',
    'route.line': 'लाइन',
    'route.directMetro': 'डायरेक्ट मेट्रो',
    'route.station': 'स्टेशन',
    'route.stations': 'स्टेशन',
    'route.changeTo': 'यहां बदलें',
    'route.arriveAt': 'पहुंचने का समय',
    'route.wait': 'प्रतीक्षा करें',
    'route.hurry': 'जल्दी करें!',
    'route.takeBus': 'बस पकड़ें',
    'route.busDesc': 'बस स्टॉप मेट्रो स्टेशन के ठीक नीचे है। बसें अक्सर चलती हैं।',
    'route.fasterThanMetro': 'मेट्रो का इंतज़ार करने से तेज़',
    'route.exitHere': 'यहाँ से बाहर निकलें',

    // Commute Card
    'commute.dailyCommute': 'दैनिक यात्रा',
    'commute.walkTo': 'तक चलकर',
    'commute.every': 'हर',
    'commute.min': 'मिनट',
    'commute.now': 'अभी',
    'commute.noUpcoming': 'अभी {station} के लिए कोई सीधी मेट्रो नहीं है',
    'commute.reaches': 'पहुंचती है',
    'commute.via': 'द्वारा',
    'commute.changes': 'बदलाव',
    'commute.direct': 'सीधी',

    // Side Menu
    'menu.language': 'भाषा',
    'menu.english': 'English',
    'menu.gujarati': 'ગુજરાતી',
    'menu.hindi': 'हिंदी',
  }
};

export const t = (key: keyof typeof translations.en, lang: Language = 'en'): string => {
  return translations[lang][key] || translations.en[key] || key;
};

export const getStationName = (station: Station | undefined | null, lang: Language = 'en'): string => {
  if (!station) return '';
  if (lang === 'gu' && station.nameGu) {
    return station.nameGu;
  }
  if (lang === 'hi' && station.nameHi) {
    return station.nameHi;
  }
  return station.name;
};
