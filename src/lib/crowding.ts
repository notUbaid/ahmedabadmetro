/**
 * Dynamic Metro Crowding System
 * 
 * Rules:
 * 1. APMC ↔ Mahatma Mandir corridor trains: ALWAYS heavily crowded
 * 2. Thaltej ↔ Vastral (Blue Line): Heavy in peak, Moderate in off-peak
 * 3. APMC ↔ Koteshwar (Red Line local): Low usually, Moderate in peak
 * 4. Koteshwar ↔ Mahatma Mandir (Green Line local): Low in non-peak, Moderate in peak
 * 5. Dynamic crowding: Trains get more crowded as they progress along their route
 */

export type CrowdLevel = 'low' | 'moderate' | 'heavy';

export interface CrowdInfo {
  level: CrowdLevel;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
}

// Peak hours: 8:00-11:00 and 17:00-20:00 on weekdays
export const isPeakHour = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  const day = date.getDay();
  const isWeekday = day >= 1 && day <= 5;
  
  // Peak hours only apply on weekdays
  if (!isWeekday) return false;
  
  return (hour >= 8 && hour < 11) || (hour >= 17 && hour < 20);
};

export const isWeekend = (date: Date = new Date()): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Check if a train is a corridor service (APMC → Mahatma Mandir or vice versa)
export const isCorridorService = (trainId: string): boolean => {
  return trainId.includes('corridor');
};

// Corridor stations for reference
const CORRIDOR_STATIONS = [
  'apmc', 'shahpur', 'gheekanta', 'kalupur', 'kalupur_east', 'apparel_park',
  'amraiwadi', 'rabari_colony', 'vastral_gam',
  // And via the other branch
  'kankaria_east', 'gandhigram', 'old_high_court', 'shahpur', 'usmanpura',
  'vadaj', 'ranip', 'sabarmati', 'ahmedabad_railway', 'chandkheda',
  'vishwakarma_college', 'tapovan_circle', 'narmada_canal', 'koba_circle',
  'gnlu', 'pdpu', 'gift_city',
  'juna_koba', 'koba_gam', 'dholakuva_circle', 'raysan', 'mahatma_mandir'
];

/**
 * Get base crowd level for a service type
 */
const getBaseLevel = (
  serviceType: 'corridor' | 'blue_line' | 'red_local' | 'green_local' | 'purple_line',
  isPeak: boolean,
  isWeekendDay: boolean
): CrowdLevel => {
  switch (serviceType) {
    case 'corridor':
      // APMC to Mahatma Mandir: ALWAYS heavily crowded
      return 'heavy';
    
    case 'blue_line':
      // Thaltej-Vastral: Heavy in peak, Moderate in off-peak
      if (isPeak) return 'heavy';
      if (isWeekendDay) return 'low';
      return 'moderate';
    
    case 'red_local':
      // APMC-Koteshwar: Low usually, Moderate in peak
      if (isPeak) return 'moderate';
      return 'low';
    
    case 'green_local':
      // Koteshwar-Mahatma Mandir: Low in non-peak, Moderate in peak
      if (isPeak) return 'moderate';
      return 'low';
    
    case 'purple_line':
      // GNLU-GIFT City: Usually moderate
      if (isPeak) return 'moderate';
      return 'low';
    
    default:
      return 'low';
  }
};

/**
 * Determine service type from train schedule info
 */
export const getServiceType = (
  line: string,
  trainId: string,
  destination?: string
): 'corridor' | 'blue_line' | 'red_local' | 'green_local' | 'purple_line' => {
  // Check if corridor service first (overrides line)
  if (isCorridorService(trainId)) {
    return 'corridor';
  }
  
  // Otherwise, determine by line
  switch (line.toLowerCase()) {
    case 'blue':
      return 'blue_line';
    case 'red':
      return 'red_local';
    case 'green':
      return 'green_local';
    case 'purple':
      return 'purple_line';
    default:
      return 'blue_line';
  }
};

/**
 * Apply dynamic crowding modifier based on position along route
 * Trains get more crowded as they progress
 * 
 * @param baseLevel - The base crowd level
 * @param progressRatio - 0.0 (start of route) to 1.0 (end of route)
 * @param isInbound - true if heading towards city center (gets more crowded), false if outbound (gets less crowded)
 */
const applyDynamicModifier = (
  baseLevel: CrowdLevel,
  progressRatio: number,
  isInbound: boolean
): CrowdLevel => {
  // Inbound morning trains get more crowded as they approach city center
  // Outbound evening trains get more crowded as they leave city center
  
  const effectiveProgress = isInbound ? progressRatio : (1 - progressRatio);
  
  // Early in journey (0-30%): one level lower
  // Middle of journey (30-70%): base level
  // Late in journey (70-100%): one level higher
  
  if (effectiveProgress < 0.3) {
    // One level lower
    if (baseLevel === 'heavy') return 'moderate';
    if (baseLevel === 'moderate') return 'low';
    return 'low';
  } else if (effectiveProgress > 0.7) {
    // One level higher (but cap at heavy)
    if (baseLevel === 'low') return 'moderate';
    if (baseLevel === 'moderate') return 'heavy';
    return 'heavy';
  }
  
  return baseLevel;
};

/**
 * Determine if a train is heading inbound (towards city center) or outbound
 * City center stations: Old High Court, Shahpur, Gheekanta, Kalupur
 */
const CITY_CENTER_STATIONS = ['old_high_court', 'shahpur', 'gheekanta', 'kalupur', 'gandhigram'];

export const isInboundTrain = (
  originStationId: string,
  destinationStationId: string,
  stationList: string[]
): boolean => {
  // Check if destination is closer to city center than origin
  const originIdx = stationList.indexOf(originStationId);
  const destIdx = stationList.indexOf(destinationStationId);
  
  // Find city center stations in the route
  let originDistToCenter = Infinity;
  let destDistToCenter = Infinity;
  
  for (const centerStation of CITY_CENTER_STATIONS) {
    const centerIdx = stationList.indexOf(centerStation);
    if (centerIdx !== -1) {
      if (originIdx !== -1) {
        originDistToCenter = Math.min(originDistToCenter, Math.abs(originIdx - centerIdx));
      }
      if (destIdx !== -1) {
        destDistToCenter = Math.min(destDistToCenter, Math.abs(destIdx - centerIdx));
      }
    }
  }
  
  // If destination is closer to center, it's inbound
  return destDistToCenter < originDistToCenter;
};

/**
 * Main function to get crowd level for a specific train/station
 */
export const getCrowdLevel = (
  line: string,
  trainId: string,
  options?: {
    stationIndex?: number;
    totalStations?: number;
    stationList?: string[];
    destinationStationId?: string;
    originStationId?: string;
  }
): CrowdInfo => {
  const now = new Date();
  const isPeak = isPeakHour(now);
  const isWeekendDay = isWeekend(now);
  
  // Get service type
  const serviceType = getServiceType(line, trainId);
  
  // Get base crowd level
  let level = getBaseLevel(serviceType, isPeak, isWeekendDay);
  
  // Apply dynamic modifier if we have position info
  if (options?.stationIndex !== undefined && options?.totalStations !== undefined && options.totalStations > 1) {
    const progressRatio = options.stationIndex / (options.totalStations - 1);
    
    // Determine inbound/outbound
    let isInbound = true; // Default assumption
    if (options.stationList && options.originStationId && options.destinationStationId) {
      isInbound = isInboundTrain(options.originStationId, options.destinationStationId, options.stationList);
    }
    
    // Morning peak: inbound trains get more crowded approaching center
    // Evening peak: outbound trains get more crowded leaving center
    const hour = now.getHours();
    const isMorningPeak = hour >= 8 && hour < 11;
    const effectiveInbound = isMorningPeak ? isInbound : !isInbound;
    
    level = applyDynamicModifier(level, progressRatio, effectiveInbound);
  }
  
  return formatCrowdLevel(level);
};

/**
 * Simple version for display without dynamic modifiers
 */
export const getSimpleCrowdLevel = (
  line: string,
  trainId: string = ''
): CrowdInfo => {
  const now = new Date();
  const isPeak = isPeakHour(now);
  const isWeekendDay = isWeekend(now);
  
  const serviceType = getServiceType(line, trainId);
  const level = getBaseLevel(serviceType, isPeak, isWeekendDay);
  
  return formatCrowdLevel(level);
};

/**
 * Format crowd level into display info
 */
export const formatCrowdLevel = (level: CrowdLevel): CrowdInfo => {
  switch (level) {
    case 'low':
      return {
        level: 'low',
        label: 'Low',
        color: '#22c55e',
        bgClass: 'bg-green-500/15',
        textClass: 'text-green-600 dark:text-green-400'
      };
    case 'moderate':
      return {
        level: 'moderate',
        label: 'Moderate',
        color: '#eab308',
        bgClass: 'bg-yellow-500/15',
        textClass: 'text-yellow-600 dark:text-yellow-400'
      };
    case 'heavy':
      return {
        level: 'heavy',
        label: 'Heavy',
        color: '#ef4444',
        bgClass: 'bg-red-500/15',
        textClass: 'text-red-600 dark:text-red-400'
      };
  }
};

/**
 * Get crowd level for a specific station on a route
 * Used when displaying crowd info for each station in a journey
 */
export const getCrowdAtStation = (
  line: string,
  trainId: string,
  stationIndex: number,
  totalStations: number,
  stationList: string[]
): CrowdInfo => {
  return getCrowdLevel(line, trainId, {
    stationIndex,
    totalStations,
    stationList,
    originStationId: stationList[0],
    destinationStationId: stationList[stationList.length - 1]
  });
};
