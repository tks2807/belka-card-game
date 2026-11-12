\set ON_ERROR_STOP on
\ir ../src/db/schema.sql
-- Existing installation + rerun of the locale migration.
\ir ../src/db/migrations/add_chat_locale.sql
\ir ../src/db/migrations/add_chat_locale.sql
INSERT INTO players (player_id, username) VALUES (1, 'test');
INSERT INTO player_chat_features (chat_id, player_id, active_title, unlocked_titles)
VALUES (-1, 1, '🎯 Победитель', '["🎯 Победитель", "🔥 На серии", "⚡ Неостановим", "🎯 Голая рука", "👑 Мастер голой", "🃏 Ветеран", "🏆 Чемпион", "💯 Сотник", "custom"]');
\ir ../src/db/migrations/normalize_title_ids.sql
\ir ../src/db/migrations/normalize_title_ids.sql
INSERT INTO chat_settings (chat_id) VALUES (-1);
INSERT INTO chat_settings VALUES (-2, 'kk');
INSERT INTO chat_settings (chat_id, locale)
SELECT -3, locale FROM chat_settings WHERE chat_id = -2
ON CONFLICT (chat_id) DO NOTHING;
DO $$ BEGIN
  ASSERT (SELECT locale FROM chat_settings WHERE chat_id = -1) = 'ru';
  ASSERT (SELECT locale FROM chat_settings WHERE chat_id = -2) = 'kk';
  ASSERT (SELECT locale FROM chat_settings WHERE chat_id = -3) = 'kk';
  ASSERT (SELECT active_title FROM player_chat_features WHERE chat_id = -1) = 'winner';
  ASSERT (SELECT unlocked_titles FROM player_chat_features WHERE chat_id = -1) =
    '["winner", "on_streak", "unstoppable", "golden_hand", "golden_master", "veteran", "champion", "centurion", "custom"]'::jsonb;
  BEGIN
    INSERT INTO chat_settings VALUES (-4, 'xx');
    RAISE EXCEPTION 'Invalid locale was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
