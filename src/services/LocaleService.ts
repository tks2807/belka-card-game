import pool from '../db';
import { Locale } from '../i18n';

export class LocaleService {
    private cache = new Map<number, Locale>();

    async get(chatId: number): Promise<Locale> {
        const cached = this.cache.get(chatId);
        if (cached) return cached;
        const result = await pool.query('SELECT locale FROM chat_settings WHERE chat_id = $1', [chatId]);
        const locale: Locale = result.rows[0]?.locale === 'kk' ? 'kk' : 'ru';
        // A concurrent /language update may have completed while SELECT was in flight.
        const updated = this.cache.get(chatId);
        if (updated) return updated;
        this.cache.set(chatId, locale);
        return locale;
    }

    async migrate(oldChatId: number, newChatId: number): Promise<void> {
        await pool.query(
            `INSERT INTO chat_settings (chat_id, locale)
             SELECT $2, locale FROM chat_settings WHERE chat_id = $1
             ON CONFLICT (chat_id) DO NOTHING`,
            [oldChatId, newChatId]
        );
        this.cache.delete(newChatId);
    }

    async set(chatId: number, locale: Locale): Promise<void> {
        await pool.query(
            `INSERT INTO chat_settings (chat_id, locale) VALUES ($1, $2)
             ON CONFLICT (chat_id) DO UPDATE SET locale = EXCLUDED.locale`,
            [chatId, locale]
        );
        this.cache.set(chatId, locale);
    }
}
