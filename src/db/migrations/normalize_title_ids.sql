-- Normalize legacy labels to stable IDs. Safe to run repeatedly; unknown titles survive.
UPDATE player_chat_features f
SET active_title = (SELECT CASE value WHEN '🎯 Победитель' THEN 'winner' WHEN '🔥 На серии' THEN 'on_streak' WHEN '⚡ Неостановим' THEN 'unstoppable' WHEN '🎯 Голая рука' THEN 'golden_hand' WHEN '👑 Мастер голой' THEN 'golden_master' WHEN '🃏 Ветеран' THEN 'veteran' WHEN '🏆 Чемпион' THEN 'champion' WHEN '💯 Сотник' THEN 'centurion' ELSE value END FROM (VALUES (f.active_title)) AS title(value)),
    unlocked_titles = COALESCE((
      SELECT jsonb_agg(CASE value WHEN '🎯 Победитель' THEN 'winner' WHEN '🔥 На серии' THEN 'on_streak' WHEN '⚡ Неостановим' THEN 'unstoppable' WHEN '🎯 Голая рука' THEN 'golden_hand' WHEN '👑 Мастер голой' THEN 'golden_master' WHEN '🃏 Ветеран' THEN 'veteran' WHEN '🏆 Чемпион' THEN 'champion' WHEN '💯 Сотник' THEN 'centurion' ELSE value END ORDER BY ordinal)
      FROM jsonb_array_elements_text(f.unlocked_titles) WITH ORDINALITY AS titles(value, ordinal)
    ), '[]'::jsonb)
WHERE active_title IN ('🎯 Победитель', '🔥 На серии', '⚡ Неостановим', '🎯 Голая рука', '👑 Мастер голой', '🃏 Ветеран', '🏆 Чемпион', '💯 Сотник')
   OR unlocked_titles ?| ARRAY['🎯 Победитель', '🔥 На серии', '⚡ Неостановим', '🎯 Голая рука', '👑 Мастер голой', '🃏 Ветеран', '🏆 Чемпион', '💯 Сотник'];
