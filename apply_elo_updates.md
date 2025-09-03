# Применение ELO обновлений к базе данных

## Шаги для обновления:

### 1. Остановить бота
```bash
# Остановите текущий процесс бота
```

### 2. Применить изменения к базе данных
```bash
# Подключитесь к базе PostgreSQL и выполните:
cd src/db
psql -U your_username -d your_database -f add_elo_rating.sql
```

Или выполните SQL команды напрямую в базе:
```sql
-- Add ELO rating to global_stats table if not exists
ALTER TABLE global_stats 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;

-- Add ELO rating to chat_stats table if not exists  
ALTER TABLE chat_stats 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;

-- Set default ELO rating for existing players
UPDATE global_stats SET elo_rating = 1000 WHERE elo_rating IS NULL;
UPDATE chat_stats SET elo_rating = 1000 WHERE elo_rating IS NULL;
```

### 3. Запустить бота с новой версией
```bash
# Запустите обновленную версию бота
node src/index.js
```

## Что изменилось:

### ✅ Добавлено:
- **ELO рейтинг** - учитывает силу противников
- **Новые команды**: `/rating` и `/ratingchat` 
- **Справедливая система**: минимум 5 игр для рейтинга
- **Комплексный расчет**: победы + очки + взятки + достижения
- **Обновленное отображение**: показывает и комплексный рейтинг, и ELO

### 🔄 Сохранено:
- **Старые команды**: `/leaderboardall` и `/leaderboardchat` работают как раньше
- **Вся статистика**: игры, победы, очки остались без изменений
- **Обратная совместимость**: существующие игроки получат ELO 1000

### 📊 Новый лидерборд показывает:
```
1. Игрок1 🎯
📊 Рейтинг: ⭐ 87 | 🏅 ELO: 1245
🃏 Игры: 23 | 🏆 Победы: 15 (65%)
🎖 Голые победы: 3 | 🥚 Яйца: 2
```

## Тестирование:

1. Сыграйте несколько игр и проверьте команды `/rating`
2. Убедитесь, что ELO изменяется в зависимости от силы противников
3. Проверьте, что старые команды `/leaderboardall` работают

## Поддержка:

Если возникли проблемы:
1. Проверьте логи бота на ошибки подключения к БД
2. Убедитесь, что колонки `elo_rating` добавились в таблицы
3. Проверьте, что методы `getPlayerELO` и `updateELORating` работают 