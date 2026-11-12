import { CatalogKey, Locale, currentLocale, translate } from './index';

// Stable database IDs. Legacy Russian values and either localized label remain accepted.
export const titleKeys = {
    winner: 'metadata.title.winner',
    on_streak: 'metadata.title.onStreak',
    unstoppable: 'metadata.title.unstoppable',
    golden_hand: 'metadata.title.goldenHand',
    golden_master: 'metadata.title.goldenMaster',
    veteran: 'metadata.title.veteran',
    champion: 'metadata.title.champion',
    centurion: 'metadata.title.centurion'
} as const satisfies Record<string, CatalogKey>;
export type TitleId = keyof typeof titleKeys;
export function normalizeTitle(value: string): string {
    for (const [id, key] of Object.entries(titleKeys)) {
        if ([id, translate('ru', key), translate('kk', key)].includes(value)) return id;
    }
    return value;
}
export function titleName(value: string, locale: Locale = currentLocale()): string {
    const id = normalizeTitle(value);
    return Object.prototype.hasOwnProperty.call(titleKeys, id) ? translate(locale, titleKeys[id as TitleId]) : value;
}
