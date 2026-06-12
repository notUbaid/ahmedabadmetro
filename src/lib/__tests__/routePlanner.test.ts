import { describe, it, expect } from 'vitest';
import { findCommonTrainRoute } from '../routePlanner';
import { trainSchedules } from '../../data/timetableFromExcel.generated';

describe('Coordinate with Friend - findCommonTrainRoute', () => {
  it('should optimize for least waiting time and traveling together (Paldi to Infocity against Apparel Park to GNLU)', () => {
    // 1. Friend's route segments (Apparel Park to GNLU)
    const blueLineTrain = trainSchedules.find(s => 
      s.stations.includes('apparel_park') && 
      s.stations.includes('old_high_court') &&
      s.stations.indexOf('apparel_park') < s.stations.indexOf('old_high_court')
    );
    
    const redLineTrain = trainSchedules.find(s => 
      s.stations.includes('old_high_court') && 
      s.stations.includes('gnlu') &&
      s.stations.indexOf('old_high_court') < s.stations.indexOf('gnlu') &&
      s.stations.includes('paldi') &&
      s.stations.indexOf('paldi') < s.stations.indexOf('old_high_court')
    );
    
    expect(blueLineTrain).toBeDefined();
    expect(redLineTrain).toBeDefined();
    
    if (!blueLineTrain || !redLineTrain) return;

    const sharedSegments = [
      { trainId: blueLineTrain.id, stations: ['apparel_park', 'kankaria_east', 'kalupur', 'gheekanta', 'shahpur', 'old_high_court'] },
      { trainId: redLineTrain.id, stations: ['old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'aec', 'sabarmati', 'motera_stadium', 'koteshwar_road', 'vishwakarma_college', 'tapovan_circle', 'narmada_canal', 'koba_circle', 'juna_koba', 'koba_gam', 'gnlu'] }
    ];

    // User wants to go from Paldi to Infocity
    const userOriginId = 'paldi';
    const userDestId = 'infocity';
    
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    const trainStartMins = parseTime(redLineTrain.startTime);
    const paldiIdx = redLineTrain.stations.indexOf('paldi');
    const trainArrivalAtPaldi = trainStartMins + redLineTrain.stationTimes[paldiIdx];
    
    // Set current time to 15 minutes before the train reaches Paldi
    const currentTimeMins = trainArrivalAtPaldi - 15;

    const route = findCommonTrainRoute(sharedSegments as any, userOriginId, userDestId, currentTimeMins);
    
    expect(route).toBeDefined();
    expect(route).not.toBeNull();
    
    if (!route) return;

    // Check if there is a 'board' step at Paldi
    const boardStep = route.steps.find(s => s.type === 'board');
    expect(boardStep?.station?.id).toBe('paldi');
    
    // The wait time at Paldi should be maximized (i.e. we take the same train, rather than an earlier train to OHC)
    expect(boardStep?.trainId).toBe(redLineTrain.id);
  });

  it('should optimize for least waiting time and traveling together (Thaltej to Infocity against Apparel Park to GNLU)', () => {
    // 1. Friend's route segments (Apparel Park to GNLU)
    const blueLineTrain = trainSchedules.find(s => 
      s.stations.includes('apparel_park') && 
      s.stations.includes('old_high_court') &&
      s.stations.indexOf('apparel_park') < s.stations.indexOf('old_high_court') &&
      s.startTime > '09:00' // Pick a later train
    );
    
    const redLineTrain = trainSchedules.find(s => 
      s.stations.includes('old_high_court') && 
      s.stations.includes('gnlu') &&
      s.stations.indexOf('old_high_court') < s.stations.indexOf('gnlu') &&
      s.stations.includes('paldi') &&
      s.stations.indexOf('paldi') < s.stations.indexOf('old_high_court') &&
      s.startTime > '09:15' // Pick a later train that will overlap
    );
    
    if (!blueLineTrain || !redLineTrain) return;

    const sharedSegments = [
      { trainId: blueLineTrain.id, stations: ['apparel_park', 'kankaria_east', 'kalupur', 'gheekanta', 'shahpur', 'old_high_court'] },
      { trainId: redLineTrain.id, stations: ['old_high_court', 'usmanpura', 'vijay_nagar', 'vadaj', 'ranip', 'aec', 'sabarmati', 'motera_stadium', 'koteshwar_road', 'vishwakarma_college', 'tapovan_circle', 'narmada_canal', 'koba_circle', 'juna_koba', 'koba_gam', 'gnlu'] }
    ];

    // User wants to go from Thaltej to Infocity
    const userOriginId = 'thaltej';
    const userDestId = 'infocity';
    
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    const trainStartMins = parseTime(redLineTrain.startTime);
    const ohcIdx = redLineTrain.stations.indexOf('old_high_court');
    const trainArrivalAtOHC = trainStartMins + redLineTrain.stationTimes[ohcIdx];
    
    // Set current time to 45 minutes before Red line train reaches OHC, plenty of time to travel from Thaltej
    const currentTimeMins = trainArrivalAtOHC - 45;

    const route = findCommonTrainRoute(sharedSegments as any, userOriginId, userDestId, currentTimeMins);
    
    expect(route).toBeDefined();
    expect(route).not.toBeNull();
    
    if (!route) return;

    // Check if there is a 'board' step at Thaltej
    const boardStep = route.steps.find(s => s.type === 'board');
    expect(boardStep?.station?.id).toBe('thaltej');
    
    // Check if the route has an 'alight' and 'board' at Old High Court for the exact same Red Line train
    // Check if the route has an 'interchange' at Old High Court for the exact same Red Line train
    const interchangeAtOHC = route.steps.find(s => s.type === 'interchange' && s.station?.id === 'old_high_court');
    if (!interchangeAtOHC) {
      console.log(JSON.stringify(route.steps, null, 2));
    }
    expect(interchangeAtOHC).toBeDefined();
    expect(interchangeAtOHC?.trainId).toBe(redLineTrain.id);
  });
});
