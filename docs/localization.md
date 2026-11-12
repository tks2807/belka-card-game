# Chat localization

- Supported locales: `ru` (default), `kk`.
- `/language` changes the whole chat's language. Any participant may use its buttons.
- `chat_settings` persists the choice; `LocaleService` caches it. A group-to-supergroup migration copies the setting unless the destination already has one.
- Incoming updates run inside an `AsyncLocalStorage` locale context. Use `localize(key, params)` inside command handlers/helpers, or `translate(locale, key, params)` when the locale is explicit.
- Games keep their own locale, refreshed on incoming updates and after a language change. Restored games load the saved chat preference. Autonomous/background work must explicitly obtain the current chat locale, as `makeAutoMove` does, rather than inherit a timer's old context.
- Both dictionaries live in `src/i18n/{ru,kk}.json`. Use descriptive keys and matching named/numbered placeholders. Do not concatenate translated words for grammar-sensitive sentences.
- Card identifiers (`♠A`, `♣J`), sticker IDs, usernames and custom season labels do not change. Known generated season names are localized only for display.
- Rank descriptions are localized at presentation time. Titles use stable IDs from `src/i18n/titles.ts`; `/title` accepts an ID or either language's full label (including its emoji). Existing Russian title labels are accepted and normalized; unknown/custom titles are preserved.
- On startup, schema creation and the idempotent title-ID migration run transactionally, before polling starts. The SQL/JSON assets are included in `dist` by `npm run build`.
- `ts-node.preferTsExts` is enabled so local `npm start`/development does not accidentally load legacy `.js` siblings from `src` instead of the current TypeScript implementation. Production runs `dist/index.js`.

## Verification

```sh
npm run test:i18n
```

This builds the application and checks catalog parity/placeholders, remaining display literals, async chat isolation, locale persistence/migration, legacy titles, full-deal/trick/round results, eggs, golden wins, surrender, and Telegram command/callback handlers. Telegram and database access are replaced with offline doubles in the Node suite; it does not prove production delivery.

For real PostgreSQL migration validation, use a **disposable database** and run:

```sh
psql "$I18N_TEST_DATABASE_URL" -X -f scripts/test-i18n-migrations.sql
```

The SQL test creates fixture rows and verifies defaults, locale constraints, title preservation, and repeat execution. Do not run fixture SQL against the production database. The actual application migrations contain no rating or game-history reset.
