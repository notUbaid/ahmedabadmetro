import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the generated JSON data BEFORE importing the timetable module
vi.mock('../timetableFromExcel.generated.json', () => {
  return {
    default: {
      trainSchedules: [
        // Train 1: Red Line Forward
        {
          id: 'TEST-RED-1',
          line: 'red',
          direction: 'forward',
          dayType: 'Mon-Fri',
          startTime: '08:00',
          stations: ['apmc', 'jivraj_park', 'rajiv_nagar', 'old_high_court', 'usmanpura'],
          stationTimes: [0, 5, 10, 15, 20], // Arrives at old_high_court at 08:15
        },
        // Train 2: Red Line Forward (1 minute behind Train 1 - an anomaly!)
        {
          id: 'TEST-RED-2',
          line: 'red',
          direction: 'forward',
          dayType: 'Mon-Fri',
          startTime: '08:01',
          stations: ['apmc', 'jivraj_park', 'rajiv_nagar', 'old_high_court', 'usmanpura'],
          stationTimes: [0, 5, 10, 15, 20], // Arrives at old_high_court at 08:16
        },
        // Train 3: Green Line Forward (Also arrives at 08:15, but different line!)
        {
          id: 'TEST-GREEN-1',
          line: 'green',
          direction: 'forward',
          dayType: 'Mon-Fri',
          startTime: '07:45',
          stations: ['koteshwar_road', 'motera_stadium', 'sabarmati', 'old_high_court', 'usmanpura'],
          stationTimes: [0, 10, 20, 30, 40], // Arrives at old_high_court at 08:15
        },
      ],
    },
  };
});

// Import the module under test after mocking
import { getUpcomingTrains, getCurrentTrainPositions } from '../timetable';

describe('Timetable Deduplication Logic', () => {
  beforeEach(() => {
    // Set system time to 08:10 AM on a Wednesday (Mon-Fri)
    vi.useFakeTimers();
    const mockDate = new Date(2024, 0, 3, 8, 10, 0); // Jan 3, 2024 is a Wednesday
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getUpcomingTrains filters out trains less than 3 minutes apart on the same line and direction', () => {
    const upcoming = getUpcomingTrains('old_high_court', 10);
    
    // We expect the 08:15 Red line train, but NOT the 08:16 Red line train!
    const redTrains = upcoming.filter(t => t.line === 'red' && t.direction === 'towards Usmanpura');
    expect(redTrains).toHaveLength(1);
    expect(redTrains[0].arrivalTime).toBe('08:15');
    
    // We expect the 08:15 Green line train to still be there, because it's a different line!
    const greenTrains = upcoming.filter(t => t.line === 'green');
    expect(greenTrains).toHaveLength(1);
    expect(greenTrains[0].arrivalTime).toBe('08:15');
  });

  it('getCurrentTrainPositions drops visually colliding trains', () => {
    // Let's set the time to 08:07. 
    // Train 1 left APMC at 08:00. At 08:07 it is between jivraj_park (08:05) and rajiv_nagar (08:10).
    // Train 2 left APMC at 08:01. At 08:07 it is between jivraj_park (08:06) and rajiv_nagar (08:11).
    // They are physically on the same segment!
    vi.setSystemTime(new Date(2024, 0, 3, 8, 7, 0));

    const positions = getCurrentTrainPositions();
    
    // Filter to trains on the jivraj_park -> rajiv_nagar segment
    const segmentTrains = positions.filter(
      p => p.fromStationId === 'jivraj_park' && p.toStationId === 'rajiv_nagar'
    );
    
    // Without deduplication, both would be here. With distance deduplication (< 0.15 diff), one is dropped!
    expect(segmentTrains).toHaveLength(1);
    expect(segmentTrains[0].id).toBe('TEST-RED-1');
  });
});
