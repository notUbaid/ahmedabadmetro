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
// Corridor trains are through-running Green Line services that start at APMC
// and go all the way to Mahatma Mandir (or vice versa).
export const isCorridorService = (trainId: string): boolean => {
  // Import is circular, so we use a lazy check based on train ID patterns.
  // L3 (Green Line) trains that go through APMC → Mahatma Mandir are corridor trains.
  // All Green Line trains are corridor trains since they all run APMC ↔ Mahatma Mandir.
  return trainId.startsWith('L3-');
};



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
  
  let level: CrowdLevel = 'low';

  // If no detailed route info, fallback to simple base levels
  if (!options || options.stationIndex === undefined || !options.stationList) {
    if (serviceType === 'corridor') return formatCrowdLevel(isPeak ? 'heavy' : 'moderate');
    if (serviceType === 'blue_line') return formatCrowdLevel(isPeak ? 'heavy' : 'moderate');
    return formatCrowdLevel(isPeak ? 'moderate' : 'low');
  }

  const { stationIndex, stationList } = options;
  const originStationId = stationList[0];
  const destStationId = stationList[stationList.length - 1];
  
  const ohcIndex = stationList.indexOf('old_high_court');
  const progress = stationIndex / Math.max(1, stationList.length - 1);
  const stationsRemaining = stationList.length - 1 - stationIndex;

  if (serviceType === 'corridor') {
    // Northbound (APMC to Gandhinagar)
    if (originStationId === 'apmc') {
      const paldiIndex = stationList.indexOf('paldi');
      const ohcIndex = stationList.indexOf('old_high_court');
      const gnluIndex = stationList.indexOf('gnlu');
      const infocityIndex = stationList.indexOf('infocity');
      
      if (paldiIndex !== -1 && stationIndex < paldiIndex) {
        level = 'low';
      } else if (ohcIndex !== -1 && stationIndex < ohcIndex) {
        level = 'moderate';
      } else if (gnluIndex !== -1 && stationIndex <= gnluIndex) {
        level = 'heavy';
      } else if (infocityIndex !== -1 && stationIndex <= infocityIndex) {
        level = 'moderate';
      } else {
        level = 'low';
      }
    } 
    // Southbound (Gandhinagar to APMC)
    else if (destStationId === 'apmc') {
      const infocityIndex = stationList.indexOf('infocity');
      const gnluIndex = stationList.indexOf('gnlu');
      const paldiIndex = stationList.indexOf('paldi');
      
      if (infocityIndex !== -1 && stationIndex < infocityIndex) {
        level = 'low';
      } else if (gnluIndex !== -1 && stationIndex < gnluIndex) {
        level = 'moderate';
      } else if (ohcIndex !== -1 && stationIndex <= ohcIndex) {
        level = 'heavy';
      } else if (paldiIndex !== -1 && stationIndex <= paldiIndex) {
        level = 'moderate';
      } else {
        level = 'low';
      }
    } else {
      // Fallback for corridor
      level = isPeak ? 'heavy' : 'moderate';
    }
  } 
  else if (serviceType === 'blue_line') {
    // Thaltej <-> Vastral
    // Bell curve: full in middle (city center), empty at ends
    if (progress < 0.2 || progress > 0.8) {
      level = 'low';
    } else if (progress >= 0.3 && progress <= 0.7) {
      level = isPeak ? 'heavy' : 'moderate';
    } else {
      level = 'moderate';
    }
  }
  else {
    // Red local, Green local, Purple line
    level = isPeak ? 'moderate' : 'low';
  }

  // Universal terminal rules:
  // 1. Trains nearing their final destination empty out
  if (stationsRemaining <= 2) {
    level = 'low';
  } else if (stationsRemaining <= 4 && level === 'heavy') {
    level = 'moderate';
  }
  
  // 2. Trains just starting are relatively empty
  if (stationIndex <= 1) {
    level = 'low';
  } else if (stationIndex <= 3 && level === 'heavy') {
    level = 'moderate';
  }

  // Weekends generally have lower crowds for commuter routes
  if (isWeekendDay && level === 'heavy') level = 'moderate';

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
