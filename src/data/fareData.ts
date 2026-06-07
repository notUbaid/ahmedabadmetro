/**
 * Station order for Blue Line fare matrix (West to East)
 */
export const BLUE_LINE_STATION_INDEX: Record<string, number> = {
    thaltej_gam: 0,
    thaltej: 1,
    doordarshan_kendra: 2,
    gurukul_road: 3,
    gujarat_university: 4,
    commerce_six_road: 5,
    stadium: 6,
    old_high_court: 7,
    shahpur: 8,
    gheekanta: 9,
    kalupur: 10,
    kankaria_east: 11,
    apparel_park: 12,
    amraiwadi: 13,
    rabari_colony: 14,
    vastral: 15,
    nirant_cross_roads: 16,
    vastral_gam: 17,
};

/**
 * Station order for Red Line fare matrix
 */
export const RED_LINE_STATION_INDEX: Record<string, number> = {
    apmc: 0,
    jivraj_park: 1,
    rajiv_nagar: 2,
    shreyas: 3,
    paldi: 4,
    gandhigram: 5,
    old_high_court: 6,
    usmanpura: 7,
    vijay_nagar: 8,
    vadaj: 9,
    ranip: 10,
    aec: 11,
    sabarmati: 12,
    motera_stadium: 13,
};

/**
 * 18x18 Fare Matrix for Blue Line (Thaltej Gam to Vastral Gam)
 */
export const BLUE_LINE_FARE_MATRIX: number[][] = [
    // TG, TH, DK, GR, GU, C6, SS, OH, SH, GH, KA, KE, AP, AM, RC, VA, NC, VG
    [5, 5, 5, 10, 10, 10, 10, 10, 15, 15, 15, 20, 20, 20, 20, 25, 25, 25], // Thaltej Gam
    [5, 5, 5, 5, 10, 10, 10, 10, 10, 15, 15, 15, 20, 20, 20, 20, 25, 25], // Thaltej
    [5, 5, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 20, 20, 20, 20, 20, 25], // Doordarshan Kendra
    [10, 5, 5, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 20, 20, 20, 20, 20], // Gurukul Road
    [10, 10, 5, 5, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20], // Gujarat University
    [10, 10, 10, 5, 5, 5, 5, 5, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20], // Commerce Six Road
    [10, 10, 10, 10, 5, 5, 5, 5, 5, 10, 10, 10, 15, 15, 15, 15, 20, 20], // S P Stadium
    [10, 10, 10, 10, 10, 5, 5, 5, 5, 5, 10, 10, 10, 15, 15, 15, 15, 20], // Old High Court
    [15, 10, 10, 10, 10, 10, 5, 5, 5, 5, 10, 10, 10, 15, 15, 15, 15, 15], // Shahpur
    [15, 15, 15, 10, 10, 10, 10, 10, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15], // Gheekanta
    [15, 15, 15, 15, 15, 10, 10, 10, 10, 5, 5, 5, 10, 10, 10, 10, 10, 15], // Kalupur Railway Station
    [20, 15, 15, 15, 15, 15, 10, 10, 10, 10, 5, 5, 5, 10, 10, 10, 10, 10], // Kankaria East
    [20, 20, 20, 15, 15, 15, 15, 15, 10, 10, 10, 5, 5, 5, 5, 10, 10, 10], // Apparel Park
    [20, 20, 20, 20, 15, 15, 15, 15, 15, 10, 10, 10, 5, 5, 5, 5, 10, 10], // Amraiwadi
    [20, 20, 20, 20, 20, 15, 15, 15, 15, 10, 10, 10, 5, 5, 5, 5, 5, 10], // Rabari Colony
    [25, 20, 20, 20, 20, 20, 15, 15, 15, 15, 10, 10, 10, 5, 5, 5, 5, 5], // Vastral
    [25, 25, 20, 20, 20, 20, 20, 20, 15, 15, 15, 10, 10, 10, 5, 5, 5, 5], // Nirant Cross Road
    [25, 25, 25, 20, 20, 20, 20, 20, 15, 15, 15, 10, 10, 10, 10, 5, 5, 5], // Vastral Gam
];

/**
 * 18 rows (Blue) x 14 columns (Red) Fare Matrix
 */
export const BLUE_RED_FARE_MATRIX: number[][] = [
    // AP, JP, RN, SH, PL, GG, OH, US, VN, VJ, RP, AE, SA, MS
    [20, 20, 15, 15, 15, 15, 10, 15, 15, 15, 15, 20, 20, 20], // Thaltej Gam
    [20, 15, 15, 15, 15, 10, 10, 10, 15, 15, 15, 15, 20, 20], // Thaltej
    [15, 15, 15, 15, 10, 10, 10, 10, 10, 15, 15, 15, 20, 20], // Doordarshan Kendra
    [15, 15, 15, 10, 10, 10, 10, 10, 10, 10, 15, 15, 15, 20], // Gurukul Road
    [15, 15, 15, 10, 10, 10, 10, 10, 10, 10, 10, 15, 15, 15], // Gujarat University
    [15, 15, 10, 10, 10, 10, 5, 5, 10, 10, 10, 15, 15, 15], // Commerce Six Road
    [15, 10, 10, 10, 10, 5, 5, 5, 10, 10, 10, 10, 15, 15], // S P Stadium
    [10, 10, 10, 10, 5, 5, 5, 5, 5, 10, 10, 10, 15, 15], // Old High Court
    [15, 15, 10, 10, 10, 10, 5, 5, 10, 10, 10, 15, 15, 15], // Shahpur
    [15, 15, 15, 10, 10, 10, 10, 10, 10, 10, 15, 15, 15, 20], // Gheekanta
    [15, 15, 15, 15, 15, 10, 10, 10, 15, 15, 15, 15, 20, 20], // Kalupur Railway Station
    [20, 20, 15, 15, 15, 15, 10, 10, 15, 15, 15, 20, 20, 20], // Kankaria East
    [20, 20, 20, 15, 15, 15, 15, 15, 15, 15, 20, 20, 20, 25], // Apparel Park
    [20, 20, 20, 20, 15, 15, 15, 15, 15, 20, 20, 20, 25, 25], // Amraiwadi
    [20, 20, 20, 20, 15, 15, 15, 15, 15, 20, 20, 20, 25, 25], // Rabari Colony
    [25, 20, 20, 20, 20, 15, 15, 15, 20, 20, 20, 25, 25, 25], // Vastral
    [25, 25, 25, 20, 20, 20, 15, 20, 20, 20, 20, 25, 25, 25], // Nirant Cross Road
    [25, 25, 25, 20, 20, 20, 20, 20, 20, 20, 20, 25, 25, 25], // Vastral Gam
];

/**
 * 14x14 Fare Matrix for Red Line (APMC to Motera Stadium)
 */
export const RED_LINE_FARE_MATRIX: number[][] = [
    // APMC, JP, RN, SH, PL, GG, OH, US, VN, VJ, RP, AE, SA, MS
    [5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20, 20], // APMC
    [5, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 20, 20, 20], // Jivraj Park
    [5, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 15, 20, 20], // Rajiv Nagar
    [10, 5, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15, 15, 20], // Shreyas
    [10, 10, 10, 5, 5, 5, 5, 10, 10, 10, 10, 15, 15, 15], // Paldi
    [10, 10, 10, 10, 5, 5, 5, 5, 10, 10, 10, 15, 15, 15], // Gandhigram
    [10, 10, 10, 10, 5, 5, 5, 5, 5, 10, 10, 10, 15, 15], // Old High Court
    [15, 10, 10, 10, 10, 5, 5, 5, 5, 10, 10, 10, 10, 15], // Usmanpura
    [15, 15, 15, 10, 10, 10, 5, 5, 5, 5, 5, 10, 10, 10], // Vijay Nagar
    [15, 15, 15, 15, 10, 10, 10, 10, 5, 5, 5, 10, 10, 10], // Vadaj
    [15, 15, 15, 15, 10, 10, 10, 10, 5, 5, 5, 5, 10, 10], // Ranip
    [20, 20, 15, 15, 15, 15, 10, 10, 10, 10, 5, 5, 5, 10], // AEC
    [20, 20, 20, 15, 15, 15, 15, 10, 10, 10, 10, 5, 5, 5], // Sabarmati
    [20, 20, 20, 20, 15, 15, 15, 15, 10, 10, 10, 10, 5, 5], // Motera Stadium
];
