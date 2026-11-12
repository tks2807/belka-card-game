CREATE TABLE IF NOT EXISTS chat_settings (
  chat_id BIGINT PRIMARY KEY,
  locale VARCHAR(2) NOT NULL DEFAULT 'ru' CHECK (locale IN ('ru', 'kk'))
);
