/**
 * Shared A4 page geometry for the on-screen preview.
 *
 * Templates render at PAGE_WIDTH; one printed A4 page is PAGE_WIDTH × 1.414.
 * The preview uses PAGE_HEIGHT as a *minimum* so a short invoice fills a full
 * page, while a long one grows past it (and paginates on export).
 */
export const A4_RATIO = 1.4142; // height / width for A4 portrait
export const PAGE_WIDTH = 820; // px — matches templates' max-width
export const PAGE_HEIGHT = Math.round(PAGE_WIDTH * A4_RATIO); // ≈ 1160px
