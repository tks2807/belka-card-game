import { AsyncLocalStorage } from 'async_hooks';
import ru from './ru.json';
import kk from './kk.json';

export type Locale = 'ru' | 'kk';

type Params = Record<string, string | number | null | undefined>;

// One locale per incoming update, isolated across concurrent chats and promises.
const localeContext = new AsyncLocalStorage<Locale>();
export const currentLocale = (): Locale => localeContext.getStore() ?? 'ru';
export function withLocale<T>(locale: Locale, work: () => T): T {
    return localeContext.run(locale, work);
}
export type CatalogKey = keyof typeof ru;
export function translate(locale: Locale, key: CatalogKey, params: Params = {}): string {
    const template = (locale === 'kk' ? kk : ru)[key];
    return template.replace(/\{(\w+)\}/g, (_, name) => String(Object.prototype.hasOwnProperty.call(params, name) ? params[name] ?? '—' : `{${name}}`));
}
export const localize = (key: CatalogKey, params: Params = {}): string => translate(currentLocale(), key, params);
const metadataKeys = (Object.keys(ru) as CatalogKey[]).filter(key => key.startsWith('metadata.'));
export function metadataText(value: string, locale: Locale = currentLocale()): string {
    const key = metadataKeys.find(key => ru[key] === value);
    return key ? translate(locale, key) : value;
}
export function seasonName(value: string, locale: Locale = currentLocale()): string {
    const match = /^(?:Season|Сезон|Маусым) (\d+)$/.exec(value);
    return match ? `${locale === 'kk' ? 'Маусым' : 'Сезон'} ${match[1]}` : value;
}

export type MessageKey = CatalogKey;
export const t = translate;
