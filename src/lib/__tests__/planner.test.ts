import { expect, test } from 'vitest';
import { planRoute, getAvailableDepartures, planRouteWithDeparture } from '@/lib/routePlanner';
import { getISTDate } from '@/lib/utils';

test('planRoute outside operating hours (Paldi to Vadaj)', () => {
    // We will override Date.prototype.getHours and getMinutes temporarily
    // to simulate 23:30 (11:30 PM)
    const RealDate = Date;
    const mockDate = new RealDate();
    mockDate.setHours(23, 30, 0, 0);

    const originalGetHours = Date.prototype.getHours;
    const originalGetMinutes = Date.prototype.getMinutes;

    try {
        Date.prototype.getHours = function() { return 23; };
        Date.prototype.getMinutes = function() { return 30; };

        const route = planRoute('paldi', 'vadaj');
        console.log("planRoute result:", route ? "Success" : "Null");
    } finally {
        Date.prototype.getHours = originalGetHours;
        Date.prototype.getMinutes = originalGetMinutes;
    }
});
