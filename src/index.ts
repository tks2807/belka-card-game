import { Telegraf, Markup, Context } from 'telegraf';
import * as dotenv from 'dotenv';
import { message } from 'telegraf/filters';
import { BelkaGame } from './game/BelkaGame';
import { Player, CardSuit, Card, TableCard, GameState, CardRank } from './types/game.types';
import { StatsService } from './services/StatsService';
import { chatManager } from './services/ChatManager';
import setupDatabase from './db/setupDatabase';
import * as https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

// Загружаем переменные окружения
dotenv.config();

// Консоль-логи конфигурации
console.log('Starting bot with environment:');
console.log(`- NODE_ENV: ${process.env['NODE_ENV'] || 'not set'}`);
console.log(`- HTTPS_PROXY: ${process.env['HTTPS_PROXY'] || 'not set'}`);
console.log(`- USE_PROXY: ${process.env['USE_PROXY'] || 'not set'}`);
console.log(`- TELEGRAM_API_URL: ${process.env['TELEGRAM_API_URL'] || 'https://api.telegram.org'}`);

// Настройка агента для прокси, если указан
let agent: any = undefined;
const useProxy = process.env['USE_PROXY'] === 'true';

if (useProxy && process.env['HTTPS_PROXY']) {
  const proxyUrl = process.env['HTTPS_PROXY'];
  console.log(`Using proxy: ${proxyUrl}`);
  
  try {
    if (proxyUrl.startsWith('socks')) {
      console.log('Using SOCKS proxy agent');
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      console.log('Using HTTPS proxy agent');
      agent = new HttpsProxyAgent(proxyUrl);
    }
    
    // Проверка proxy подключения
    console.log('Testing proxy connection...');
    fetch(`${process.env['TELEGRAM_API_URL'] || 'https://api.telegram.org'}/getMe`, {
      agent,
      timeout: 10000
    }).then((res: any) => {
      console.log(`Proxy test status: ${res.status}`);
    }).catch((err: any) => {
      console.error('Proxy test error:', err.message);
    });
  } catch (err) {
    console.error('Error creating proxy agent:', err);
    console.log('Falling back to direct connection');
    agent = undefined;
  }
}

// Настраиваем параметры HTTP запросов с увеличенным тайм-аутом
const httpOptions = {
  agent,
  timeout: 60000, // 60 секунд тайм-аут
  keepAlive: true
};

// Инициализируем базу данных перед запуском бота
setupDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Error initializing database:', err);
    process.exit(1);
  });

// Инициализируем бота с дополнительными настройками
const bot = new Telegraf(process.env['BOT_TOKEN'] || '', {
  telegram: {
    apiRoot: process.env['TELEGRAM_API_URL'] || 'https://api.telegram.org',
    webhookReply: false,
    agent: httpOptions.agent,
    // @ts-ignore - timeoutMs поддерживается, но не объявлен в типах
    timeoutMs: httpOptions.timeout
  },
  // Расширенное логирование для отладки проблем соединения
  // @ts-ignore
  debug: true,
  // Добавляем обработку супергрупп
  handleSupergroups: true
});

// Перехватываем методы отправки сообщений для проверки ID чата
const originalSendMessage = bot.telegram.sendMessage.bind(bot.telegram);
bot.telegram.sendMessage = async (chatId: number | string, text: string, extra?: any) => {
  try {
    // Если это числовой ID и отрицательный (группа), проверяем актуальность
    if (typeof chatId === 'number' && chatId < 0) {
      const actualChatId = chatManager.getActualChatId(chatId);
      if (chatId !== actualChatId) {
        console.log(`[MIGRATION] Автоматически заменяем ID чата для отправки сообщения: ${chatId} -> ${actualChatId}`);
        chatId = actualChatId;
      }
    }
    return await originalSendMessage(chatId, text, extra);
  } catch (error: any) {
    // Если есть ошибка миграции, пробуем перехватить её здесь
    if (error && 
        typeof error === 'object' && 
        'description' in error && 
        typeof error.description === 'string' && 
        error.description.includes('upgraded to a supergroup chat') && 
        'parameters' in error && 
        error.parameters && 
        typeof error.parameters === 'object' &&
        'migrate_to_chat_id' in error.parameters) {
      
      const oldChatId = chatId;
      const newChatId = error.parameters.migrate_to_chat_id as number;
      
      console.log(`[MIGRATION] Обнаружена миграция чата при отправке сообщения: ${oldChatId} -> ${newChatId}`);
      
      // Сохраняем новое сопоставление
      if (typeof oldChatId === 'number') {
        chatManager.addMapping(oldChatId, newChatId);
      }
      
      // Пробуем отправить сообщение в новый чат
      console.log(`[MIGRATION] Повторная отправка сообщения в новый чат: ${newChatId}`);
      return await originalSendMessage(newChatId, text, extra);
    }
    
    throw error; // Переброс других ошибок
  }
};

// Аналогично для других методов отправки
const originalReplyWithSticker = bot.telegram.sendSticker.bind(bot.telegram);
bot.telegram.sendSticker = async (chatId: number | string, sticker: string, extra?: any) => {
  try {
    // Если это числовой ID и отрицательный (группа), проверяем актуальность
    if (typeof chatId === 'number' && chatId < 0) {
      const actualChatId = chatManager.getActualChatId(chatId);
      if (chatId !== actualChatId) {
        console.log(`[MIGRATION] Автоматически заменяем ID чата для отправки стикера: ${chatId} -> ${actualChatId}`);
        chatId = actualChatId;
      }
    }
    return await originalReplyWithSticker(chatId, sticker, extra);
  } catch (error: any) {
    // Если есть ошибка миграции, пробуем перехватить её здесь
    if (error && 
        typeof error === 'object' && 
        'description' in error && 
        typeof error.description === 'string' && 
        error.description.includes('upgraded to a supergroup chat') && 
        'parameters' in error && 
        error.parameters && 
        typeof error.parameters === 'object' &&
        'migrate_to_chat_id' in error.parameters) {
      
      const oldChatId = chatId;
      const newChatId = error.parameters.migrate_to_chat_id as number;
      
      console.log(`[MIGRATION] Обнаружена миграция чата при отправке стикера: ${oldChatId} -> ${newChatId}`);
      
      // Сохраняем новое сопоставление
      if (typeof oldChatId === 'number') {
        chatManager.addMapping(oldChatId, newChatId);
      }
      
      // Пробуем отправить стикер в новый чат
      console.log(`[MIGRATION] Повторная отправка стикера в новый чат: ${newChatId}`);
      return await originalReplyWithSticker(newChatId, sticker, extra);
    }
    
    throw error; // Переброс других ошибок
  }
};

// Добавляем обработчик ошибок для бота
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  
  // Если пользователь заблокировал бота, логируем и не прерываем работу
  if (err && typeof err === 'object' && 'description' in err && 
      typeof err.description === 'string' && err.description.includes('bot was blocked by the user')) {
    
    // Извлекаем ID пользователя, если возможно
    let userId = "неизвестный";
    if (err && typeof err === 'object' && 'on' in err && 
        typeof err.on === 'object' && err.on !== null && 'payload' in err.on && 
        typeof err.on.payload === 'object' && err.on.payload !== null && 'chat_id' in err.on.payload) {
      userId = String((err.on.payload as any).chat_id);
    }
    
    console.log(`[BLOCKED] Пользователь ${userId} заблокировал бота. Пропускаем сообщение.`);
    return; // Просто логируем и продолжаем работу
  }
  
  // Обработка ошибки миграции чата в супергруппу
  if (err && typeof err === 'object' && 'description' in err && typeof err.description === 'string') {
    // Поиск нового ID чата в сообщении об ошибке
    const migrationMatch = err.description.match(/migrate to chat id (-\d+)/i);
    if (migrationMatch && migrationMatch[1]) {
      const oldChatId = ctx.chat?.id;
      const newChatId = parseInt(migrationMatch[1], 10);
      
      console.log(`[MIGRATION] Обнаружена миграция чата из ${oldChatId} в супергруппу ${newChatId}`);
      
      if (oldChatId) {
        // Сохраняем сопоставление в ChatManager
        chatManager.addMapping(oldChatId, newChatId);
        
        // Получаем игру из старого чата
        const game = games.get(oldChatId);
        
        if (game) {
          // Переносим игру в новый чат
          games.set(newChatId, game);
          games.delete(oldChatId);
          
          // Обновляем ID чата для всех игроков
          const gameState = game.getGameState();
          
          gameState.players.forEach(player => {
            if (player.chatId === oldChatId) {
              player.chatId = newChatId;
            }
            
            // Обновляем карты в хранилище
            const playerInfo = playerCardsInPrivateChat.get(player.id);
            if (playerInfo && playerInfo.gameId === oldChatId) {
              playerCardsInPrivateChat.set(player.id, {
                ...playerInfo,
                gameId: newChatId
              });
            }
          });
          
          // Сообщаем об успешной миграции
          try {
            bot.telegram.sendMessage(
              newChatId, 
              'Чат обновлен до супергруппы. Игра автоматически перенесена в новый чат.'
            );
            console.log('[MIGRATION] Игра успешно перенесена в новый чат');
          } catch (sendError) {
            console.error('[MIGRATION] Ошибка при отправке сообщения в новый чат:', sendError);
          }
        } else {
          // Если игры нет, просто сохраняем сопоставление
          console.log(`[MIGRATION] Игра не найдена для чата ${oldChatId}, сохраняем только сопоставление`);
        }
        
        // Пробуем отправить сообщение в новый чат
        try {
          if (ctx.message && 'text' in ctx.message) {
            bot.telegram.sendMessage(
              newChatId,
              ctx.message.text
            );
          }
        } catch (sendError) {
          console.error('[MIGRATION] Ошибка при отправке сообщения в новый чат:', sendError);
        }
      }
    }
  }
});

// Хранилище игр
const games = new Map<number, BelkaGame>();

// Хранилище информации о картах игроков в личных чатах
const playerCardsInPrivateChat = new Map<number, { cards: Card[], gameId: number }>();

// ================= Emoji token mapping per deal =================
// Ровно 36 эмодзи — по одной на карту. Мы будем их перетасовывать на каждую раздачу.
const EMOJI_TOKENS: string[] = [
  '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚',
  '🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😴','🤤','🤠','😺','😸','😹','😻','😼'
];

// --- Ключ карты и хранилище эмодзи ---
type CardKey = string; // например "♠7", "♥K"
const cardKey = (c: Card): CardKey => `${c.suit}${c.rank}`;

type EmojiStore = {
  e2c: Map<string, Card>;     // emoji -> Card
  c2e: Map<CardKey, string>;  // "♠7" -> emoji
};

// На каждую игру (чат) — свой стор
const emojiStores = new Map<number, EmojiStore>(); // chatId -> store

function getCardByEmoji(chatId: number, emoji: string): Card | null {
  const store = emojiStores.get(chatId);
  if (!store) return null;
  return store.e2c.get(emoji) || null;
}

function getEmojiByCard(chatId: number, card: Card): string | null {
  const store = emojiStores.get(chatId);
  if (!store) return null;
  return store.c2e.get(cardKey(card)) || null;
}

function removeByEmoji(chatId: number, emoji: string) {
  const store = emojiStores.get(chatId);
  if (!store) return;
  const card = store.e2c.get(emoji);
  if (!card) return;
  store.e2c.delete(emoji);
  store.c2e.delete(cardKey(card));
}

function clearEmojiStore(chatId: number) {
  emojiStores.delete(chatId);
}

function initEmojiMapForDeal(chatId: number) {
  const shuffled = shuffleArray(EMOJI_TOKENS);
  const store: EmojiStore = { e2c: new Map(), c2e: new Map() };

  const allCardKeys = Object.keys(cardStickers); // ["♠7", "♠8", ..., "♦A"]
  const keysShuffled = shuffleArray(allCardKeys); // доп. случайность

  const len = Math.min(shuffled.length, keysShuffled.length);
  for (let i = 0; i < len; i++) {
    const key = keysShuffled[i];
    const suit = key[0] as CardSuit;
    const rank = key.substring(1) as CardRank;
    const card = { suit, rank, value: 0 } as Card; // value не используется для маппинга

    const emoji = shuffled[i];
    store.e2c.set(emoji, card);
    store.c2e.set(key, emoji);
  }

  emojiStores.set(chatId, store);
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]; // копируем, чтобы не мутировать оригинал
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Префикс, чтобы уверенно отличать токен-сообщение от обычного текста
const EMOJI_PREFIX = '§:';

// Интерфейс для группировки карт по масти
interface CardsBySuit {
    [suit: string]: Card[] | undefined;
}

// Отображение карт на стикеры
interface CardSticker {
    fileId: string;    // ID стикера в Telegram
    card: Card;        // Соответствующая карта
}

// Хранилище соответствий карт и стикеров
const cardStickers: { [key: string]: string } = {
    // Пики
    '♠7': 'CAACAgUAAxkDAAIEOWfZCtljnc0MneX4xhYL4-0bVT9wAAJfAQACVyrBVZgoDoBoN4s0NgQ',
    '♠8': 'CAACAgUAAxkDAAIEJ2fZCIOcAYEphhdKZD1CSFYwqbnaAALmAQACkYDAVVhfNhGDmXaFNgQ',
    '♠9': 'CAACAgUAAxkDAAIEO2fZCtozPWxrftTAJ9x4Y_I4sZYqAAJMAQACVNvBVQ6J5yTZpE90NgQ',
    '♠10': 'CAACAgUAAxkDAAIEPGfZCtpFa0XrQEn70i9Jh4ci2guzAAJ-AQACMRxxVqvHRoEJTsHcNgQ',
    '♠J': 'CAACAgUAAxkDAAIERmfZCvCCv2I-y_P7peIsmOtbeLdDAAKBAQACDXPAVWos8ldKhjasNgQ',
    '♠Q': 'CAACAgUAAxkDAAIER2fZCvHAF8g0TlyFPeipR6kofyC9AAKpAgACiZPAVVigAmH3ZQUuNgQ',
    '♠K': 'CAACAgUAAxkDAAIEEGfZBo-xn9j7o-ekIX1Duma-Ibj5AAKlAQACa2nAVeCjtI0sCyCoNgQ',
    '♠A': 'CAACAgUAAxkDAAIESWfZCvG3xEaFHj_7bb82MxtSdKgnAAJ7AQACgJnAVeD42v7uFlqgNgQ',
    
    // Крести
    '♣7': 'CAACAgUAAxkDAAIEKGfZCIMB9sGkXrYBjquHLhTxM9YaAALpAAOanMBV-p6MpO8DT3E2BA',
    '♣8': 'CAACAgUAAxkDAAIETGfZCvJjzgHB2akLC0UUyk9ZigIJAAJlAQACayfAVfMNtS82uVIgNgQ',
    '♣9': 'CAACAgUAAxkDAAIETWfZCvLzGrFrozQu2oWWCH4JZRfXAAIfAQACg9PBVfRdtJ1hlPBrNgQ',
    '♣10': 'CAACAgUAAxkDAAIETmfZCvJopSrAat6OSnRF7rrMk9RUAAJYAQACkIzAVWqaKiO5FRmdNgQ',
    '♣J': 'CAACAgUAAxkDAAIEKWfZCIRISyc3nO0XzVuNgyfYXD4FAAJKAQACtVLBVacmKs428ayMNgQ',
    '♣Q': 'CAACAgUAAxkDAAIEUGfZCvKN232BJmtrx-pGZUfvn02ZAAJjAQAC1lTBVUH0muvr30MGNgQ',
    '♣K': 'CAACAgUAAxkDAAIEUWfZCvOZa5hQfYy3MqaYOq8Gow-pAAJqAQACtXXAVSxTAh2tsevONgQ',
    '♣A': 'CAACAgUAAxkDAAIEUmfZCvPg3hEudQjuvFwpCaoEjH-sAAJWAQACTsrAVR2w87xsPLfNNgQ',
    
    // Черви
    '♥7': 'CAACAgUAAxkDAAIEFGfZBo-Zwnq1M2du_6GKRzdEKaG2AAJkAQAC1X3BVVzY34i5GXHQNgQ',
    '♥8': 'CAACAgUAAxkDAAIEFWfZBo9iiRS8OqteSopTOMzGz7mOAAJYAQACT7rBVQLR8GSac1m8NgQ',
    '♥9': 'CAACAgUAAxkDAAIELGfZCIQ3WcS369M1sdeMbXCwWWh2AAKkAQACgPLBVdxX6QUuXgajNgQ',
    '♥10': 'CAACAgUAAxkDAAIEF2fZBo8WD73xI96vqrInR1f0rKgIAAIRAQACQVvAVW6I30V-k1lZNgQ',
    '♥J': 'CAACAgUAAxkDAAIELmfZCIS9A-LmwSZFoooxBosa-MRtAAJPAQAC5nrBVV4dVDLw60NkNgQ',
    '♥Q': 'CAACAgUAAxkDAAIEYmfZCveUZptceq0Ubi-SByu1MAk1AAJXAQACGB7AVZwo_L8w7QUCNgQ',
    '♥K': 'CAACAgUAAxkDAAIEFmfZBo9aet9zu_gTtSqAEYNlyQABNgACGQEAAhRTwVWjUBF47pA6ETYE',
    '♥A': 'CAACAgUAAxkDAAIEZGfZCveUCGfxMF26aZLPWkZV1JJHAAKKAQAC9IjAVUr-jhrgPNBoNgQ',
    
    // Буби
    '♦7': 'CAACAgUAAxkDAAIEEWfZBo8oKUKp-5Y2jiZFbw1YDc1QAAKNAQACslbAVbRxwx7tNKAqNgQ',
    '♦8': 'CAACAgUAAxkDAAIEVWfZCvN0gwJAax8mYIgHgvdvGfWRAAJdAQACa0TAVaOlxOpPw2PhNgQ',
    '♦9': 'CAACAgUAAxkDAAIEEmfZBo8xq3zSfrsL1EVobe1oZEEsAAI1AQAC5CTBVVWD4WjnG1dCNgQ',
    '♦10': 'CAACAgUAAxkDAAIEKmfZCISH02EU3UvZfj5OdCWx6a99AAJSAQACGVvAVXyb4ntYTbUqNgQ',
    '♦J': 'CAACAgUAAxkDAAIEWGfZCvQ33_UAAY8sMzaQ8kVyb-aTwwACTQEAAnHCyVW3tBaN5V6XEDYE',
    '♦Q': 'CAACAgUAAxkDAAIEE2fZBo8TAAHkLJ_Z90QCGAdnrsbpVAACuAEAArhlwFVXtlTiCEWnDTYE',
    '♦K': 'CAACAgUAAxkDAAIEWmfZCvWrrApNbx_UHIORg5KJbB3oAAJ-AQACuf7BVYGHtHzfhYbPNgQ',
    '♦A': 'CAACAgUAAxkDAAIEW2fZCvUwObpoPRbYEx9yTL5ebj0kAAJMAQACuWvBVQKMX0_5YOpsNgQ'
};

// Соответствие стикеров картам
const stickerToCard: Map<string, { suit: CardSuit, rank: CardRank }> = new Map();

// Дополнительная Map для поиска по file_unique_id (будет заполнена при логировании стикеров)
const uniqueIdToCard: Map<string, { suit: CardSuit, rank: CardRank }> = new Map();

// Заполнение соответствия стикеров картам
for (const key in cardStickers) {
    const [suit, rank] = [key[0] as CardSuit, key.substring(1) as CardRank];
    stickerToCard.set(cardStickers[key], { suit, rank });
}

// Включаем inline режим
bot.telegram.setMyCommands([
    { command: 'start', description: 'Начать работу с ботом' },
    { command: 'help', description: 'Показать справку' },
    { command: 'join', description: 'Присоединиться к игре' },
    { command: 'startbelka', description: 'Начать игру (Белка - до 12 глаз)' },
    { command: 'startwalka', description: 'Начать игру (Шалқа - до 6 глаз)' },
    //{ command: 'time', description: 'Включить автоматические ходы (30 сек)' },
    { command: 'swap', description: 'Обмен местами: первый пишет /swap, второй тоже /swap — меняются' },
    { command: 'swapcancel', description: 'Отменить ожидание обмена (может только инициатор)' },
    { command: 'ratingall', description: 'Глобальный рейтинг игроков' },
    { command: 'ratingchat', description: 'Рейтинг игроков (этот чат)' },
    { command: 'endgame', description: 'Проголосовать за завершение игры' },
    { command: 'clearbot', description: 'Сбросить игру' },
    { command: 'warmuty', description: 'Показать благодарности участникам проекта' },
    { command: 'ranks', description: 'Показать систему рангов' },
    { command: 'myrank', description: 'Мой ранг в этом чате' }
]).then(() => {
    // Включаем инлайн-режим
    return bot.telegram.setWebhook(''); // Сбрасываем вебхук для long polling
}).then(() => {
    // Активируем инлайн-режим
    console.log('Инлайн-режим активирован');
}).catch(err => {
    console.error('Ошибка при настройке команд бота:', err);
});

// Активируем режим inline для бота
bot.on('inline_query', async (ctx) => {
    try {
        const userId = ctx.from.id;
        console.log(`[LOG] Получен inline запрос от пользователя: ${userId}`);
        
        // Получаем информацию о картах игрока из хранилища
        const playerInfo = playerCardsInPrivateChat.get(userId);
        
        if (!playerInfo || !playerInfo.cards || playerInfo.cards.length === 0) {
            console.log(`[LOG] Карты не найдены для пользователя ${userId}`);
            
            // Проверяем, есть ли виртуальные игроки, связанные с этим пользователем
            const virtualIds = [userId + 1000, userId + 2000, userId + 3000];
            let virtualPlayerCards: Card[] = [];
            let virtualPlayerId: number | null = null;
            
            for (const vId of virtualIds) {
                const vPlayerInfo = playerCardsInPrivateChat.get(vId);
                if (vPlayerInfo && vPlayerInfo.cards && vPlayerInfo.cards.length > 0) {
                    virtualPlayerCards = vPlayerInfo.cards;
                    virtualPlayerId = vId;
                    break;
                }
            }
            
            if (virtualPlayerCards.length > 0 && virtualPlayerId) {
                console.log(`[LOG] Найдены карты виртуального игрока ${virtualPlayerId}`);
                
                // Готовим результаты для inline query из карт виртуального игрока
                const results: InlineQueryResultCachedSticker[] = virtualPlayerCards.map((card, index) => {
                    const stickerKey = `${card.suit}${card.rank}`;
                    const stickerId = cardStickers[stickerKey];
                    
                    if (!stickerId) {
                        console.log(`[LOG] Стикер для карты ${stickerKey} не найден`);
                        return null as unknown as InlineQueryResultCachedSticker;
                    }
                    
                    return {
                        type: 'sticker' as const,
                        id: `card_${index}`,
                        sticker_file_id: stickerId,
                        input_message_content: {
                            message_text: `${card.suit}${card.rank}`
                        }
                    };
                }).filter(item => item !== null);
                
                console.log(`[LOG] Отправляем ${results.length} стикеров виртуального игрока в ответ на inline запрос`);
                
                await ctx.answerInlineQuery(results, {
                    cache_time: 1, // Минимальное время кеширования для обновления в реальном времени
                    is_personal: true // Результаты персонализированы для этого пользователя
                });
                return;
            }
            
            // Если карты не найдены, отправляем пустой результат
            await ctx.answerInlineQuery([], {
                cache_time: 0
            });
            return;
        }
        
        console.log(`[LOG] Найдено ${playerInfo.cards.length} карт для пользователя ${userId}`);
        
        // Готовим результаты для inline query
        const results: InlineQueryResultCachedSticker[] = playerInfo.cards.map((card, index) => {
            const stickerKey = `${card.suit}${card.rank}`;
            const stickerId = cardStickers[stickerKey];
            
            if (!stickerId) {
                console.log(`[LOG] Стикер для карты ${stickerKey} не найден`);
                return null as unknown as InlineQueryResultCachedSticker;
            }
            
            return {
                type: 'sticker' as const,
                id: `card_${index}`,
                sticker_file_id: stickerId,
                input_message_content: {
                    message_text: `${EMOJI_PREFIX}${getEmojiByCard(playerInfo.gameId, card)}`
                }
            };
        }).filter(item => item !== null);
        
        console.log(`[LOG] Отправляем ${results.length} стикеров в ответ на inline запрос`);
        
        await ctx.answerInlineQuery(results, {
            cache_time: 1, // Минимальное время кеширования для обновления в реальном времени
            is_personal: true // Результаты персонализированы для этого пользователя
        });
    } catch (error) {
        console.error('Ошибка при обработке inline запроса:', error);
    }
});

// Безопасная отправка сообщений
async function safeSendMessage(ctx: any, text: string, extra?: any) {
  try {
    return await ctx.reply(text, extra);
  } catch (error: any) {
    if (error && 
        typeof error === 'object' && 
        'description' in error && 
        typeof error.description === 'string' && 
        error.description.includes('bot was blocked by the user')) {
      let userId = "неизвестный";
      if (error.on && typeof error.on === 'object' && 'payload' in error.on && 
          typeof error.on.payload === 'object' && error.on.payload && 'chat_id' in error.on.payload) {
        userId = String(error.on.payload.chat_id);
      }
      console.log(`[BLOCKED] Пользователь ${userId} заблокировал бота. Пропускаем сообщение.`);
      return null;
    }
    
    // Для ошибок миграции чата
    if (error && 
        typeof error === 'object' && 
        'description' in error && 
        typeof error.description === 'string' && 
        error.description.includes('upgraded to a supergroup chat') && 
        'parameters' in error && 
        error.parameters && 
        typeof error.parameters === 'object' &&
        'migrate_to_chat_id' in error.parameters) {
      
      const oldChatId = ctx.chat?.id;
      const newChatId = error.parameters.migrate_to_chat_id as number;
      
      console.log(`[MIGRATION] Обнаружена миграция чата при выполнении команды: ${oldChatId} -> ${newChatId}`);
      
      // Сохраняем новое сопоставление
      if (oldChatId && typeof oldChatId === 'number') {
        chatManager.addMapping(oldChatId, newChatId);
        
        // Пробуем отправить сообщение в новый чат
        try {
          console.log(`[MIGRATION] Повторная отправка сообщения в новый чат: ${newChatId}`);
          return await bot.telegram.sendMessage(newChatId, text, extra);
        } catch (retryError) {
          console.error('[MIGRATION] Ошибка при повторной отправке:', retryError);
        }
      }
    }
    
    // Логируем другие ошибки, но не останавливаем бота
    console.error('Ошибка при отправке сообщения:', error);
    return null;
  }
}

// Обработчик команды /start
bot.start(async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        await safeSendMessage(ctx, 'Добро пожаловать в игру Белка! Используйте /help для получения списка команд.');
    } catch (error) {
        console.error('Ошибка в команде /start:', error);
    }
});

// Обработчик команды /help
bot.help(async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        const helpText = `
Белка - карточная игра для 4 игроков.

Команды:
/join - Присоединиться к игре
/startbelka - Начать игру в режиме "Белка" (до 12 глаз)
/startwalka - Начать игру в режиме "Шалқа" (до 6 глаз) - быстрая игра
/state - Показать текущее состояние игры

📊 *Статистика и рейтинг:*
/rating - Лидерборд (первые 5 мест)
/ratingall - Общий лидерборд всех чатов
/ratingchat - Лидерборд этого чата
/ranks - Система рангов
/myrank - Мой персональный ранг
image.png
🎮 Управление игрой:
/endgame - Проголосовать за завершение игры
/clearbot - Сбросить текущую игру (в случае проблем)
/warmuty - Показать благодарности участникам проекта

Как играть:
- После начала игры ваши карты автоматически доступны в инлайн-панели
- Чтобы сделать ход, есть три способа:
  1. Отправьте стикер карты в чат
  2. Начните вводить @имя_бота в поле сообщения, и выберите карту из появившейся панели
  3. Отправьте текстом название карты (например: "♠7" или "♥K")

Режимы игры:
- "Белка" (/startbelka) - классический режим игры до 12 глаз
- "Шалқа" (/startwalka) - укороченный режим игры до 6 глаз

Правила игры:
- Цель: набрать 12 глаз (режим "Белка") или 6 глаз (режим "Шалқа"), или выиграть "голую"
- Старшинство карт: 7, 8, 9, Дама, Король, 10, Туз, Валет
- Валеты всегда козыри: крести > пики > черви > буби
- Очки: Туз - 11, 10 - 10, Король - 4, Дама - 3, Валет - 2
- Если ход начинается с козыря или валета, нужно ходить козырем (включая валетов)
- Если ход начинается с обычной масти, нужно ходить в эту масть (валеты нельзя использовать)
- Если нужной масти нет, можно ходить любой картой (включая валетов)
- После 1-го раунда выигравшей команде всегда 2 глаза
- В последующих раундах: 61-90 очков = 1 глаз, 91-119 очков = 2 глаза
- Если валет крести у соперников, победителям раунда +1 глаз
- 120 очков + все взятки = "голая" (мгновенная победа)
- Если обе команды набрали по 60 очков = "яйца" (раунд переигрывается, победитель получает 4 очка)
- Пересдача: если у игрока ≤13 очков или ≥5 карт одной масти
`;
        await safeSendMessage(ctx, helpText);
    } catch (error) {
        console.error('Ошибка в команде /help:', error);
    }
});

// Обработчик команды /join
bot.command('join', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        const userId = ctx.from?.id;
        const username = ctx.from?.username || `Player${userId}`;
        
        if (!userId) {
            await safeSendMessage(ctx, 'Не удалось определить пользователя');
            return;
        }

        // Проверяем, есть ли уже игра с актуальным ID чата
        let game = games.get(actualChatId);
        
        // Если игры нет с актуальным ID, проверяем старый ID
        if (!game && chatId !== actualChatId) {
            game = games.get(chatId);
            if (game) {
                // Если нашли игру со старым ID, переносим её на новый
                games.set(actualChatId, game);
                games.delete(chatId);
                console.log(`[MIGRATION] Игра перенесена со старого ID ${chatId} на новый ${actualChatId}`);
            }
        }
        
        if (!game) {
            game = new BelkaGame(actualChatId);
            games.set(actualChatId, game);
            // Добавляем пользователя в игру
            const success = game.addPlayer({ id: userId, username, chatId: actualChatId });
            if (success) {
                await safeSendMessage(ctx, 'Создана новая игра. Вы присоединились к игре.');
            } else {
                await safeSendMessage(ctx, 'Ошибка при присоединении к игре.');
            }
        } else {
            // Игра уже существует, добавляем игрока
            const gameState = game.getGameState();
            
            // Проверяем, не в игре ли уже этот игрок
            const playerExists = gameState.players.some(p => p.id === userId);
            
            if (playerExists) {
                await safeSendMessage(ctx, 'Вы уже присоединены к игре.');
                return;
            }
            
            // Проверяем, не заполнена ли уже игра
            if (gameState.players.length >= 4) {
                await safeSendMessage(ctx, 'Игра уже заполнена (4 игрока).');
                return;
            }
            
            // Проверяем, не активна ли уже игра
            if (gameState.isActive) {
                await safeSendMessage(ctx, 'Игра уже начата. Дождитесь следующей игры.');
                return;
            }
            
            // Добавляем игрока
            const success = game.addPlayer({ id: userId, username, chatId: actualChatId });
            
            if (success) {
                await safeSendMessage(ctx, 'Вы присоединились к игре.');
                
                // Если это 4-й игрок, сообщаем о готовности начать игру
                if (gameState.players.length === 4) {
                    await safeSendMessage(ctx, 'Все игроки собраны! Используйте /startbelka для начала игры в режиме "Белка" или /startwalka для режима "Шалқа".');
                }
            } else {
                await safeSendMessage(ctx, 'Ошибка при присоединении к игре.');
            }
        }

        const gameState = game.getGameState();
        let playersList = 'Текущие игроки:\n';
        gameState.players.forEach((player, index) => {
          playersList += `${index + 1}. ${player.username}\n`;
        });

        await safeSendMessage(ctx, playersList);
        if (gameState.players.length === 4) {
          await safeSendMessage(ctx, 'Все игроки присоединились! Выберите режим игры:\n/startbelka - Классический режим (до 12 глаз)\n/startwalka - Быстрая игра (до 6 глаз)');
        } else {
          await safeSendMessage(ctx, `Ожидание игроков... ${gameState.players.length}/4`);
        }
    } catch (error) {
        console.error('Ошибка в команде /join:', error);
        // Не выбрасываем ошибку дальше, чтобы не останавливать бота
    }
});

// Обработка команды /warmuty - для благодарностей участникам проекта
bot.command('warmuty', async (ctx) => {
  try {
      const thanksMessage = `Спасибо шармутам поддерживающим проект: @adylkanovv @dossi4 @m1ralem @ozhek @aidar_t @xviiali @t0ksss @baabyll`;
      
      await safeSendMessage(ctx, thanksMessage);
  } catch (error) {
      console.error('Ошибка при выполнении команды warmuty: ', error);
      await safeSendMessage(ctx, 'Произошла ошибка при отображении благодарностей');
  }
});

// Обработчик команды /startbelka
bot.command('startbelka', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        // Проверяем, есть ли уже игра с актуальным ID чата
        let game = games.get(actualChatId);
        
        // Если игры нет с актуальным ID, проверяем старый ID
        if (!game && chatId !== actualChatId) {
            game = games.get(chatId);
            if (game) {
                // Если нашли игру со старым ID, переносим её на новый
                games.set(actualChatId, game);
                games.delete(chatId);
                console.log(`[MIGRATION] Игра перенесена со старого ID ${chatId} на новый ${actualChatId}`);
            }
        }
        
        if (!game) {
            await safeSendMessage(ctx, 'Игра не найдена. Создайте новую игру с помощью /join');
            return;
        }
        
        const gameState = game.getGameState();
        
        if (gameState.isActive) {
            await safeSendMessage(ctx, 'Игра уже запущена!');
            return;
        }
        
        if (gameState.players.length < 4) {
            await safeSendMessage(ctx, `Недостаточно игроков! Текущее количество: ${gameState.players.length}/4`);
            return;
        }
        
        // Запускаем игру в режиме "белка" (до 12 глаз)
        const gameSummary = game.startGame('belka');
        
        // Получаем обновленное состояние игры
        const updatedState = game.getGameState();

        // Инициализируем эмодзи-отображение для этой раздачи
        initEmojiMapForDeal(actualChatId);
        
        // Помещаем карты всех игроков в хранилище для инлайн-режима
        updatedState.players.forEach(player => {
            console.log(`[LOG] Добавляем карты игрока ${player.username} в хранилище для инлайн-режима`);
            playerCardsInPrivateChat.set(player.id, {
                cards: [...player.cards],
                gameId: actualChatId
            });
        });
        
        // Отправляем информацию о начальном состоянии игры в чат
        await safeSendMessage(ctx, gameSummary, {
          reply_markup: {
              inline_keyboard: [[
                  { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
              ]]
          }
      });
    } catch (error) {
        console.error('Ошибка в команде /startbelka:', error);
        // Не выбрасываем ошибку дальше, чтобы не останавливать бота
    }
});

// Обработчик команды /startwalka
bot.command('startwalka', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        // Проверяем, есть ли уже игра с актуальным ID чата
        let game = games.get(actualChatId);
        
        // Если игры нет с актуальным ID, проверяем старый ID
        if (!game && chatId !== actualChatId) {
            game = games.get(chatId);
            if (game) {
                // Если нашли игру со старым ID, переносим её на новый
                games.set(actualChatId, game);
                games.delete(chatId);
                console.log(`[MIGRATION] Игра перенесена со старого ID ${chatId} на новый ${actualChatId}`);
            }
        }
        
        if (!game) {
            await safeSendMessage(ctx, 'Игра не найдена. Создайте новую игру с помощью /join');
            return;
        }
        
        const gameState = game.getGameState();
        
        if (gameState.isActive) {
            await safeSendMessage(ctx, 'Игра уже запущена!');
            return;
        }
        
        if (gameState.players.length < 4) {
            await safeSendMessage(ctx, `Недостаточно игроков! Текущее количество: ${gameState.players.length}/4`);
            return;
        }
        
        // Запускаем игру в режиме "Шалқа" (до 6 глаз)
        const gameSummary = game.startGame('walka');
        
        // Получаем обновленное состояние игры
        const updatedState = game.getGameState();

        // Инициализируем эмодзи-отображение для этой раздачи
        initEmojiMapForDeal(actualChatId);
        
        // Помещаем карты всех игроков в хранилище для инлайн-режима
        updatedState.players.forEach(player => {
            console.log(`[LOG] Добавляем карты игрока ${player.username} в хранилище для инлайн-режима (режим: Шалқа)`);
            playerCardsInPrivateChat.set(player.id, {
                cards: [...player.cards],
                gameId: actualChatId
            });
        });
        
        // Отправляем информацию о начальном состоянии игры в чат
        await safeSendMessage(ctx, gameSummary, {
          reply_markup: {
              inline_keyboard: [[
                  { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
              ]]
          }
      });
    } catch (error) {
        console.error('Ошибка в команде /startwalka:', error);
        // Не выбрасываем ошибку дальше, чтобы не останавливать бота
    }
});

// Обработчик команды /state
bot.command('state', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        // Проверяем, есть ли уже игра с актуальным ID чата
        let game = games.get(actualChatId);
        
        // Если игры нет с актуальным ID, проверяем старый ID
        if (!game && chatId !== actualChatId) {
            game = games.get(chatId);
            if (game) {
                // Если нашли игру со старым ID, переносим её на новый
                games.set(actualChatId, game);
                games.delete(chatId);
                console.log(`[MIGRATION] Игра перенесена со старого ID ${chatId} на новый ${actualChatId}`);
            }
        }

        if (!game) {
            await safeSendMessage(ctx, 'Игра не найдена. Начните новую игру с помощью /startbelka');
            return;
        }

        // Получаем и отправляем информацию о текущем состоянии игры
        const gameSummary = game.getGameSummary();
        await safeSendMessage(ctx, gameSummary, {
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                ]]
            }
        });
    } catch (error) {
        console.error('Ошибка в команде /state:', error);
        // Не выбрасываем ошибку дальше, чтобы не останавливать бота
    }
});

const statsService = new StatsService();

// --- Leaderboard Pagination ---

const LEADERBOARD_LIMIT = 5;

// Helper to send leaderboard (all) - старая версия


// Helper to send improved leaderboard (all) - новая версия с комплексным рейтингом
async function sendLeaderboardAllImproved(ctx: any, offset = 0, isEdit = false) {
  console.log('sendLeaderboardAllImproved called with offset:', offset, 'isEdit:', isEdit);
  const limit = LEADERBOARD_LIMIT;
  const leaderboardEntries = await statsService.getLeaderboardAllImproved(offset, limit);
  console.log('Fetched improved leaderboardEntries.length:', leaderboardEntries.length);
  if (leaderboardEntries.length === 0 && offset === 0) {
      await ctx.reply('Рейтинговый лидерборд пока пуст. Для участия в рейтинге нужно сыграть минимум 5 игр.');
      return;
    }
    let message = '🏆 Рейтинговая таблица лидеров (все чаты) 🏆\n\n';
    leaderboardEntries.forEach(([playerId, stats], index) => {
    const s = stats as typeof stats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any };
    const position = offset + index + 1;
    const statusIcon = s.isQualified ? '🎯' : '🎲';
    
    if (s.isQualified) {
      message += `*${position}. ${s.username}* ${statusIcon}\n` +
        `📊 Рейтинг: ⚔️ ${s.eloRating} ELO\n` +
        `${s.rank.icon} Ранг: ${s.rank.name}\n` +
        `🃏 Игры: ${s.gamesPlayed} | 🏆 Победы: ${s.gamesWon} (${s.winrate}%)\n` +
        `🎖 Голые победы: ${s.golayaCount} | 🥚 Яйца: ${s.eggsCount}\n\n`;
    } else {
      message += `*${position}. ${s.username}* ${statusIcon}\n` +
        `📊 Рейтинг: ${s.winrate}% (${s.gamesPlayed} игр)\n` +
        `🃏 Игры: ${s.gamesPlayed} | 🏆 Победы: ${s.gamesWon} (${s.winrate}%)\n` +
        `🎖 Голые победы: ${s.golayaCount} | 🥚 Яйца: ${s.eggsCount}\n\n`;
    }
  });
  
  // Navigation buttons
  const keyboard = [];
  if (offset > 0) keyboard.push({ text: '⬅️ Назад', callback_data: `leaderboardallimproved:${offset - limit}` });
  if (leaderboardEntries.length === limit) keyboard.push({ text: 'Вперед ➡️', callback_data: `leaderboardallimproved:${offset + limit}` });
  console.log('Improved leaderboard keyboard:', keyboard);
  const replyMarkup = { inline_keyboard: [keyboard] };
  if (isEdit) {
    console.log('Editing improved leaderboard message...');
    await ctx.editMessageText(message, { reply_markup: replyMarkup, parse_mode: 'Markdown' });
  } else {
    console.log('Sending new improved leaderboard message...');
    await ctx.reply(message, { reply_markup: replyMarkup, parse_mode: 'Markdown' });
  }
}



// Helper to send improved leaderboard (chat) - новая версия с комплексным рейтингом
async function sendLeaderboardChatImproved(ctx: any, chatId: number, offset = 0, isEdit = false) {
  console.log('sendLeaderboardChatImproved called with chatId:', chatId, 'offset:', offset, 'isEdit:', isEdit);
  const limit = LEADERBOARD_LIMIT;
  const leaderboardEntries = await statsService.getLeaderboardChatImproved(chatId, offset, limit);
  console.log('Fetched improved chat leaderboardEntries.length:', leaderboardEntries.length);
  if (leaderboardEntries.length === 0 && offset === 0) {
    await safeSendMessage(ctx, 'Рейтинговый лидерборд для этого чата пока пуст. Для участия в рейтинге нужно сыграть минимум 5 игр.');
    return;
  }
  let message = '🏆 Рейтинговая таблица лидеров (этот чат) 🏆\n\n';
  leaderboardEntries.forEach(([playerId, stats], index) => {
    const s = stats as typeof stats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any };
    const position = offset + index + 1;
    const statusIcon = s.isQualified ? '🎯' : '🎲';
    
    if (s.isQualified) {
      message += `*${position}. ${s.username}* ${statusIcon}\n` +
        `📊 Рейтинг: ⚔️ ${s.eloRating} ELO\n` +
        `${s.rank.icon} Ранг: ${s.rank.name}\n` +
        `🃏 Игры: ${s.gamesPlayed} | 🏆 Победы: ${s.gamesWon} (${s.winrate}%)\n` +
        `🎖 Голые победы: ${s.golayaCount} | 🥚 Яйца: ${s.eggsCount}\n\n`;
    } else {
      message += `*${position}. ${s.username}* ${statusIcon}\n` +
        `📊 Рейтинг: ${s.winrate}% (${s.gamesPlayed} игр)\n` +
        `🃏 Игры: ${s.gamesPlayed} | 🏆 Победы: ${s.gamesWon} (${s.winrate}%)\n` +
        `🎖 Голые победы: ${s.golayaCount} | 🥚 Яйца: ${s.eggsCount}\n\n`;
    }
    });
  
  // Navigation buttons
  const keyboard = [];
  if (offset > 0) keyboard.push({ text: '⬅️ Назад', callback_data: `leaderboardchatimproved:${offset - limit}` });
  if (leaderboardEntries.length === limit) keyboard.push({ text: 'Вперед ➡️', callback_data: `leaderboardchatimproved:${offset + limit}` });
  console.log('Improved chat leaderboard keyboard:', keyboard);
  const replyMarkup = { inline_keyboard: [keyboard] };
  if (isEdit) {
    console.log('Editing improved chat leaderboard message...');
    await ctx.editMessageText(message, { reply_markup: replyMarkup, parse_mode: 'Markdown' });
  } else {
    console.log('Sending new improved chat leaderboard message...');
    await safeSendMessage(ctx, message, { reply_markup: replyMarkup, parse_mode: 'Markdown' });
  }
}

// --- Bot commands ---

// Команды рейтинга
bot.command('rating', async (ctx) => {
  await sendLeaderboardAllImproved(ctx, 0);
});

bot.command('ratingall', async (ctx) => {
  await sendLeaderboardAllImproved(ctx, 0);
});

bot.command('ratingchat', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
  const actualChatId = chatManager.getActualChatId(chatId);
  await sendLeaderboardChatImproved(ctx, actualChatId, 0);
});

// --- Callback handlers for pagination ---
bot.action(/leaderboardallimproved:(\d+)/, async (ctx) => {
  const offset = parseInt(ctx.match[1], 10) || 0;
  await sendLeaderboardAllImproved(ctx, Math.max(0, offset), true);
});

bot.action(/leaderboardchatimproved:(\d+)/, async (ctx) => {
  const offset = parseInt(ctx.match[1], 10) || 0;
  const chatId = ctx.chat?.id;
  if (!chatId) return;
    const actualChatId = chatManager.getActualChatId(chatId);
  await sendLeaderboardChatImproved(ctx, actualChatId, Math.max(0, offset), true);
});

// --- Auto-move system ---

interface GameTimer {
  chatId: number;
  playerId: number;
  timeout: NodeJS.Timeout;
}

const activeTimers = new Map<number, GameTimer>();
const MOVE_TIMEOUT = 30000; // 30 секунд

// Функция для установки таймера хода
function setMoveTimer(chatId: number, playerId: number) {
  // Очищаем существующий таймер для этого чата
  clearMoveTimer(chatId);
  
  const timeout = setTimeout(async () => {
    try {
      console.log(`[TIMER] Время истекло для игрока ${playerId} в чате ${chatId}`);
      await makeAutoMove(chatId, playerId);
    } catch (error) {
      console.error('[TIMER] Ошибка при автоматическом ходе:', error);
    }
  }, MOVE_TIMEOUT);
  
  activeTimers.set(chatId, { chatId, playerId, timeout });
  console.log(`[TIMER] Установлен таймер для игрока ${playerId} в чате ${chatId}`);
}

// Функция для очистки таймера
function clearMoveTimer(chatId: number) {
  const timer = activeTimers.get(chatId);
  if (timer) {
    clearTimeout(timer.timeout);
    activeTimers.delete(chatId);
    console.log(`[TIMER] Таймер очищен для чата ${chatId}`);
  }
}

// Функция для автоматического хода
async function makeAutoMove(chatId: number, playerId: number) {
  try {
    const game = games.get(chatId);
    if (!game) {
      console.log(`[TIMER] Игра не найдена для чата ${chatId}`);
      return;
    }
    
    const gameState = game.getGameState();
    if (!gameState.isActive) {
      console.log(`[TIMER] Игра неактивна в чате ${chatId}`);
      return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      console.log(`[TIMER] Игрок ${playerId} больше не на ходу в чате ${chatId}`);
      return;
    }
    
    // Находим оптимальную карту для автохода
    const cardIndex = findOptimalCardForAutoMove(currentPlayer, gameState);
    if (cardIndex === -1) {
      console.log(`[TIMER] Не удалось найти карту для автохода игрока ${playerId}`);
      return;
    }
    
    const selectedCard = currentPlayer.cards[cardIndex];
    console.log(`[TIMER] Автоматический ход игрока ${currentPlayer.username}: ${selectedCard.suit}${selectedCard.rank}`);
    
    // Делаем ход
    const result = await game.makeMove(playerId, cardIndex);
    
    if (result.success) {
      // Отправляем уведомление об автоматическом ходе
      const message = `⏰ Время истекло! Автоматический ход игрока ${currentPlayer.username}: ${selectedCard.suit}${selectedCard.rank}`;
      
      await bot.telegram.sendMessage(chatId, message);
      
      // Обрабатываем результат как обычно
      if (result.isRoundComplete && result.roundSummary) {
        await bot.telegram.sendMessage(chatId, result.roundSummary, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
            ]]
          }
        });
        
        if (result.isGameRoundComplete && result.roundResults) {
          await bot.telegram.sendMessage(chatId, result.roundResults, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
              ]]
            }
          });
        }
      } else {
        // Устанавливаем таймер для следующего игрока
        const updatedState = game.getGameState();
        if (updatedState.isActive) {
          const nextPlayer = updatedState.players[updatedState.currentPlayerIndex];
          if (nextPlayer) {
            setMoveTimer(chatId, nextPlayer.id);
          }
        }
      }
    }
    
    // Очищаем таймер
    clearMoveTimer(chatId);
    
  } catch (error) {
    console.error('[TIMER] Ошибка при выполнении автоматического хода:', error);
  }
}

// Функция для поиска оптимальной карты для автохода
function findOptimalCardForAutoMove(player: Player, gameState: GameState): number {
  const cards = player.cards;
  if (!cards || cards.length === 0) return -1;
  
  // Если на столе нет карт, играем минимальную не козырную карту
  if (gameState.tableCards.length === 0) {
    // Ищем минимальную не козырную и не валет
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.suit !== gameState.trump && card.rank !== 'J') {
        return i;
      }
    }
    // Если только козыри и валеты, берем первую карту
    return 0;
  }
  
  const firstCard = gameState.tableCards[0].card;
  const firstCardSuit = firstCard.suit;
  const isFirstCardTrump = firstCardSuit === gameState.trump || firstCard.rank === 'J';
  
  if (isFirstCardTrump) {
    // Нужно ходить козырем или валетом
    const trumpCards: { index: number; value: number }[] = [];
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.suit === gameState.trump || card.rank === 'J') {
        // Определяем силу карты для сортировки (меньше = слабее)
        let value = 0;
        if (card.rank === 'J') {
          // Валеты: крести=4, пики=3, черви=2, буби=1
          switch (card.suit) {
            case '♣': value = 14; break;
            case '♠': value = 13; break;
            case '♥': value = 12; break;
            case '♦': value = 11; break;
          }
        } else {
          // Обычные козыри: 7=1, 8=2, 9=3, Д=4, К=5, 10=6, Т=7
          switch (card.rank) {
            case '7': value = 1; break;
            case '8': value = 2; break;
            case '9': value = 3; break;
            case 'Q': value = 4; break;
            case 'K': value = 5; break;
            case '10': value = 6; break;
            case 'A': value = 7; break;
          }
        }
        trumpCards.push({ index: i, value });
      }
    }
    
    if (trumpCards.length > 0) {
      // Сортируем по силе (слабые первыми) и возвращаем индекс самой слабой
      trumpCards.sort((a, b) => a.value - b.value);
      return trumpCards[0].index;
    }
  } else {
    // Нужно ходить в масть (не валетом)
    const suitCards: { index: number; value: number }[] = [];
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.suit === firstCardSuit && card.rank !== 'J') {
        // Определяем силу карты
        let value = 0;
        switch (card.rank) {
          case '7': value = 1; break;
          case '8': value = 2; break;
          case '9': value = 3; break;
          case 'Q': value = 4; break;
          case 'K': value = 5; break;
          case '10': value = 6; break;
          case 'A': value = 7; break;
        }
        suitCards.push({ index: i, value });
      }
    }
    
    if (suitCards.length > 0) {
      // Возвращаем самую слабую карту нужной масти
      suitCards.sort((a, b) => a.value - b.value);
      return suitCards[0].index;
    }
  }
  
  // Если подходящих карт нет, ищем любую минимальную карту
  const otherCards: { index: number; value: number }[] = [];
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    let value = 0;
    
    if (card.rank === 'J') {
      // Валеты в последнюю очередь
      value = 100;
    } else if (card.suit === gameState.trump) {
      // Козыри тоже в последнюю очередь
      value = 50;
    } else {
      // Обычные карты
      switch (card.rank) {
        case '7': value = 1; break;
        case '8': value = 2; break;
        case '9': value = 3; break;
        case 'Q': value = 4; break;
        case 'K': value = 5; break;
        case '10': value = 6; break;
        case 'A': value = 7; break;
      }
    }
    
    otherCards.push({ index: i, value });
  }
  
  if (otherCards.length > 0) {
    otherCards.sort((a, b) => a.value - b.value);
    return otherCards[0].index;
  }
  
  // В крайнем случае возвращаем первую карту
  return 0;
}

// Команда /time для включения/выключения таймера
// bot.command('time', async (ctx) => {
//   try {
//     const chatId = ctx.chat?.id;
//     if (!chatId) return;
    
//     const actualChatId = chatManager.getActualChatId(chatId);
//     const game = games.get(actualChatId);
    
//     if (!game) {
//       return await safeSendMessage(ctx, 'В этом чате нет активной игры');
//     }
    
//     const gameState = game.getGameState();
//     if (!gameState.isActive) {
//       return await safeSendMessage(ctx, 'Игра не начата. Запустите игру командой /startbelka или /startwalka');
//     }
    
//     const currentPlayer = gameState.players[gameState.currentPlayerIndex];
//     if (!currentPlayer) {
//       return await safeSendMessage(ctx, 'Не удалось определить текущего игрока');
//     }
    
//     // Проверяем, есть ли уже активный таймер
//     const existingTimer = activeTimers.get(actualChatId);
    
//     if (existingTimer) {
//       clearMoveTimer(actualChatId);
//       await safeSendMessage(ctx, '⏰ Таймер отключен для текущей игры');
//     } else {
//       setMoveTimer(actualChatId, currentPlayer.id);
//       await safeSendMessage(ctx, `⏰ Таймер включен! Игрок ${currentPlayer.username} должен сделать ход в течение 30 секунд, иначе ход будет сделан автоматически`);
//     }
    
//   } catch (error) {
//     console.error('Ошибка в команде /time:', error);
//     await safeSendMessage(ctx, 'Произошла ошибка при работе с таймером');
//   }
// });

// Обработчик команды /endgame
bot.command('endgame', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        const userId = ctx.from?.id;
        if (!chatId || !userId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        // Проверяем, есть ли уже игра с актуальным ID чата
        let game = games.get(actualChatId);
        
        // Если игры нет с актуальным ID, проверяем старый ID
        if (!game && chatId !== actualChatId) {
            game = games.get(chatId);
            if (game) {
                // Если нашли игру со старым ID, переносим её на новый
                games.set(actualChatId, game);
                games.delete(chatId);
                console.log(`[MIGRATION] Игра перенесена со старого ID ${chatId} на новый ${actualChatId}`);
            }
        }

        if (!game) {
            await ctx.reply('Игра не найдена');
            return;
        }

        // Голосуем за завершение игры
        const result = game.voteForEnd(userId);

        switch (result.status) {
            case 'not_player':
                await ctx.reply('Вы не являетесь участником игры или игра не активна');
                break;
            case 'already_voted':
                await ctx.reply('Вы уже проголосовали за завершение игры');
                break;
            case 'voted':
                const votesCount = result.votesCount || 0;
                const requiredVotes = result.requiredVotes || 0;
                
                await ctx.reply(`Игрок @${ctx.from.username} проголосовал за завершение игры. Голосов: ${votesCount}/${requiredVotes}`);
                
                // Проверяем, достаточно ли голосов для завершения игры
                if (votesCount >= requiredVotes) {
                    // Игра успешно завершена, очищаем карты всех игроков
                    const gameState = game.getGameState();
                    gameState.players.forEach(player => {
                        playerCardsInPrivateChat.delete(player.id);
                    });
                    
                    console.log(`[LOG] Хранилище карт очищено для всех игроков после завершения игры в чате ${actualChatId}`);
                    
                    // Удаляем игру из хранилища
                    games.delete(actualChatId);
                    
                    // Очищаем таймеры для этого чата
                    clearMoveTimer(actualChatId);
                    console.log(`[TIMER] Таймеры очищены после завершения игры голосованием в чате ${actualChatId}`);
                    
                    await ctx.reply('Игра завершена по голосованию игроков. Используйте /join, чтобы начать новую игру.');
                }
                break;
            default:
                await ctx.reply('Не удалось проголосовать за завершение игры');
        }
    } catch (error) {
        console.error('Ошибка в команде /endgame:', error);
        await ctx.reply('Произошла ошибка при обработке команды');
    }
});

// Обработчик команды /clearbot
bot.command('clearbot', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);

        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('Не удалось определить пользователя');
            return;
        }

        // Проверяем, существует ли игра для этого чата (с учетом обоих ID)
        let gameExists = games.has(actualChatId);
        let gameToClean = games.get(actualChatId);
        
        // Проверяем старый ID, если не нашли с актуальным
        if (!gameExists && chatId !== actualChatId) {
            gameExists = games.has(chatId);
            gameToClean = games.get(chatId);
        }
        
        if (gameExists && gameToClean) {
            const gameState = gameToClean.getGameState();
            // Очищаем карты всех игроков из хранилища
            gameState.players.forEach(player => {
                playerCardsInPrivateChat.delete(player.id);
            });
            
            console.log(`[LOG] Хранилище карт очищено для всех игроков из чата ${actualChatId}`);
            
            // Удаляем игру из хранилища (обоих ID)
            games.delete(actualChatId);
            if (chatId !== actualChatId) {
                games.delete(chatId);
            }
            
            // Очищаем таймеры для этого чата
            clearMoveTimer(actualChatId);
            console.log(`[TIMER] Таймеры очищены для чата ${actualChatId}`);
            
            await ctx.reply('🧹 Игра успешно сброшена. Используйте /join, чтобы начать новую игру.');
        } else {
            await ctx.reply('Активной игры не найдено. Используйте /join, чтобы начать новую игру.');
        }
    } catch (error) {
        console.error('Ошибка в команде /clearbot:', error);
        await ctx.reply('Произошла ошибка при сбросе игры');
    }
});

// Команда для отображения системы рангов
bot.command('ranks', async (ctx) => {
    const statsService = new StatsService();
    const allRanks = statsService.getAllRanks();
    
    let message = '🏆 Система рангов белки 🏆\n\n';
    message += 'Ранги основаны на ELO рейтинге в казахском стиле:\n\n';
    
    allRanks.forEach((rank) => {
        message += `${rank.icon} **${rank.name}**\n`;
        message += `📊 ELO: ${rank.min} - ${rank.max}\n`;
        message += `📝 ${rank.description}\n\n`;
    });
    
    message += '💡 *Совет*: Играйте больше игр и побеждайте сильных противников для повышения рейтинга!';
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

// Команда помощи
bot.command('help', (ctx) => {
  const helpMessage = `🎮 *Добро пожаловать в игру Белка!* 🎮

🃏 *Команды игры:*
/startbelka - Начать игру Белка (до 12 глаз)
/startwalka - Начать игру Шалқа (до 6 глаз) 
/join - Присоединиться к игре
/endgame - Проголосовать за завершение игры
/clearbot - Сбросить игру

📊 *Статистика и рейтинг:*
/rating - Лидерборд (первые 5 мест)
/ratingall - Общий лидерборд всех чатов
/ratingchat - Лидерборд этого чата
/ranks - Система рангов
/myrank - Мой ранг в этом чате

ℹ️ *Информация:*
/help - Эта справка
/warmuty - Благодарности

🎯 *Как играть:*
1. Создайте игру командой /startbelka или /startwalka
2. Другие игроки присоединяются через /join
3. Когда наберется 4 игрока, игра начнется автоматически
4. Используйте кнопки под картами для ходов

🏆 *Рейтинговая система:*
- Для участия в рейтинге нужно сыграть минимум 5 игр
- ELO рейтинг учитывает силу противников и вашу игру
- Казахские ранги от Сарт до Аңыз (/ranks)`;
  
  ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Команда для просмотра персонального ранга в чате
bot.command('myrank', async (ctx) => {
    const userId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || 'Неизвестный';
    const chatId = ctx.chat?.id;
    
    if (!userId) {
        await ctx.reply('Не удалось определить пользователя.');
        return;
    }
    
    if (!chatId || chatId > 0) {
        await ctx.reply('❌ Эта команда работает только в групповых чатах.\n\n💡 Для просмотра глобального рейтинга используйте:\n/ratingall - общий лидерборд');
        return;
    }
    
    const statsService = new StatsService();
    
    // Показываем только чат ELO
    const playerELO = await statsService.getPlayerChatELO(userId, chatId);
    const rank = statsService.getRankByELO(playerELO);
    const progress = statsService.getRankProgress(playerELO);
    
    let message = `🎖 *Ваш ранг в этом чате, ${username}* 🎖\n\n`;
    message += `${rank.icon} **${rank.name}**\n`;
    message += `📊 ELO: ${playerELO}\n`;
    message += `📝 ${rank.description}\n\n`;
    
    if (progress.next) {
        const progressBar = '▓'.repeat(Math.floor(progress.progress / 10)) + '░'.repeat(10 - Math.floor(progress.progress / 10));
        message += `📈 *Прогресс до ${progress.next.name}:*\n`;
        message += `${progressBar} ${progress.progress}%\n`;
        message += `🎯 Нужно еще: ${progress.eloToNext} ELO\n\n`;
    } else {
        message += `🌟 *Поздравляем!* Вы достигли максимального ранга!\n\n`;
    }
    
    message += '💪 Продолжайте играть в этом чате для повышения рейтинга!';
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

// Ожидание пары для обмена местами: chatId -> playerId (инициатор ожидания)
const pendingSwap = new Map<number, {id: number, username: string;}>();

// Обработчик команды /swap
// Поведение: первый игрок пишет /swap — встаёт "в очередь" на обмен.
// Следующий игрок, который напишет /swap, меняется с ним местами.
// Обмен разрешён только между взятками (когда стол пуст).
// Обработчик команды /swap (обмен местами игроков)
bot.command('swap', async (ctx) => {
  try {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    const username = ctx.from?.username || `Player${userId}`;
    if (!chatId || !userId) return;

    const actualChatId = chatManager.getActualChatId(chatId);
    
    // Проверяем, есть ли уже игра с актуальным ID чата
    let game = games.get(actualChatId);
    
    // Если игры нет с актуальным ID, проверяем старый ID
    if (!game && chatId !== actualChatId) {
        game = games.get(chatId);
        if (game) {
            // Если нашли игру со старым ID, переносим её на новый
            games.set(actualChatId, game);
            games.delete(chatId);
            console.log(`[MIGRATION] Игра перенесена со старого ID ${chatId} на новый ${actualChatId}`);
        }
    }

    if (!game) {
      await safeSendMessage(ctx, 'Нет активной игры для обмена.');
      return;
    }

    const state = game.getGameState();
    
    // Разрешаем обмен только если раунд еще не начался
    if (state.teams.team1.tricks !== 0 && state.teams.team2.tricks !== 0) {
      await safeSendMessage(ctx, 'Обмен местами разрешён только до начала раунда.');
      return;
    }

    // Разрешаем обмен только между взятками (когда стол пуст)
    if (state.tableCards.length > 0) {
      await safeSendMessage(ctx, 'Обмен местами разрешён только между взятками (когда стол пуст).');
      return;
    }

    // Если уже кто-то ожидает обмена
    const pending = pendingSwap.get(actualChatId);

    if (!pending) {
      // Если нет ожидания, ставим пользователя в очередь
      pendingSwap.set(actualChatId, { id: userId, username });
      await safeSendMessage(ctx, 'Ожидание обмена: следующий игрок, который напишет /swap, поменяется с вами местами. Для отмены используйте /swapcancel');
      return;
    }

    // Если пользователь сам себя вызывает
    if (pending.id === userId) {
      await safeSendMessage(ctx, 'Вы уже ожидаете обмена. Для отмены используйте /swapcancel');
      return;
    }

    // Выполняем обмен
    const firstPlayer = pending;
    const secondPlayer = { id: userId, username };

    const result = game.swapPlayers(firstPlayer, secondPlayer, actualChatId);

    // Очищаем ожидание обмена
    pendingSwap.delete(actualChatId);

    if (result.success) {
      await safeSendMessage(ctx, `Обмен местами выполнен между @${firstPlayer.username} и @${secondPlayer.username}.`);
    } else {
      await safeSendMessage(ctx, result.message || 'Не удалось выполнить обмен.');
    }

    // Получаем и отправляем информацию о текущем состоянии игры
    const gameSummary = game.getGameSummary();
    await safeSendMessage(ctx, gameSummary, {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
            ]]
        }
    });
  } catch (error) {
    console.error('Ошибка в команде /swap:', error);
    await safeSendMessage(ctx, 'Произошла ошибка при обмене местами');
  }
});

// Команда /swapcancel для отмены ожидания обмена
bot.command('swapcancel', async (ctx) => {
  try {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || !userId) return;

    const actualChatId = chatManager.getActualChatId(chatId);

    const waiterId = pendingSwap.get(actualChatId);
    if (!waiterId) {
      await safeSendMessage(ctx, 'Сейчас никто не ожидает обмена.');
      return;
    }

    pendingSwap.delete(actualChatId);
    await safeSendMessage(ctx, 'Ожидание обмена отменено.');
  } catch (error) {
    console.error('Ошибка в команде /swapcancel:', error);
    await safeSendMessage(ctx, 'Произошла ошибка при отмене ожидания обмена');
  }
});


// Функция для форматирования карт игрока
function formatPlayerCards(player: Player, state: GameState): string {
    // Группировка и сортировка карт по масти
    const cardsBySuit = player.cards.reduce((acc: CardsBySuit, card) => {
        if (!acc[card.suit]) {
            acc[card.suit] = [];
        }
        acc[card.suit]!.push(card);
        return acc;
    }, {});

    // Сортировка карт в каждой масти по значению
    Object.values(cardsBySuit).forEach(cards => {
        cards?.sort((a, b) => a.value - b.value);
    });

    // Формируем сообщение с картами
    let message = `Карты игрока ${player.username} (всего ${player.cards.length}):\n`;
    
    // Отображение карт по мастям
    const suits: CardSuit[] = ['♠', '♣', '♦', '♥'];
    suits.forEach(suit => {
        if (cardsBySuit[suit] && cardsBySuit[suit]!.length > 0) {
            const cardsInSuit = cardsBySuit[suit]!.map(card => {
                const index = player.cards.findIndex(c => c === card) + 1;
                return `${index}) ${card.rank}`;
            }).join(', ');
            message += `\n${suit}: ${cardsInSuit}`;
        }
    });

    message += `\n\n${state.trump === null ? 'Козырей нет' : `Козырь: ${state.trump}`}`;
    
    // Показываем значок козыря для держателя валета крести
    if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
        message += " 🃏";
    }
    
    // Добавляем информацию о мастях игроков только после первого раунда
    if (state.currentRound > 1 && state.playerSuitMap && state.playerSuitMap.has(player.id)) {
        message += ` (${state.playerSuitMap.get(player.id)})`;
    }
    
    const isCurrentPlayer = state.players[state.currentPlayerIndex]?.id === player.id;
    
    if (isCurrentPlayer) {
        message += '\n\n🎯 Сейчас ваш ход!';
        
        if (state.tableCards.length > 0) {
            const firstCard = state.tableCards[0].card;
            const firstCardSuit = firstCard.suit;
            const isFirstCardTrump = firstCardSuit === state.trump || firstCard.rank === 'J';
            
            if (isFirstCardTrump) {
                // Если первая карта козырная или валет
                
                // Проверяем, есть ли у игрока козыри (включая вальтов)
                const hasTrump = player.cards.some(c => 
                    c.suit === state.trump || c.rank === 'J'
                );
                
                if (hasTrump) {
                    message += `\n❗️ Нужно ходить козырем (включая вальтов), так как первая карта козырная`;
                } else {
                    message += `\n❗️ У вас нет козырей, можно ходить любой картой`;
                }
            } else {
                // Если первая карта не козырная и не валет
                
                // Проверяем, есть ли у игрока карты масти первой карты
                const hasSuit = player.cards.some(c => c.suit === firstCardSuit && c.rank !== 'J');
                
                if (hasSuit) {
                    message += `\n❗️ Нужно ходить в масть ${firstCardSuit}, валеты нельзя использовать`;
                } else {
                    message += `\n❗️ У вас нет карт масти ${firstCardSuit}, можно ходить любой картой (включая валетов)`;
                }
            }
        }
    } else {
        message += '\n\nОжидайте свой ход...';
    }

    return message;
}

// Функция для получения публичного состояния игры
function getPublicGameState(state: GameState): string {
    let message = `🃏 Раунд ${state.currentRound}\n`;
    message += `♠️♣️♦️♥️ Козырь: ${state.trump}`;
    
    // Показываем значок козыря для держателя валета крести
    if (state.clubJackHolder && !state.hideClubJackHolder) {
        message += ` (определен игроком ${state.clubJackHolder.username})`;
    }
    
    message += `\n\n`;

    // Информация о командах
    message += '👥 Команда 1:\n';
    for (const playerId of state.teams.team1.players.map(p => p.id)) {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
            let playerName = player.username;
            
            // Показываем значок козыря для держателя валета крести
            if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            // Добавляем информацию о мастях игроков только после первого раунда
            if (state.currentRound > 1 && state.playerSuitMap && state.playerSuitMap.has(player.id)) {
                playerName += ` (${state.playerSuitMap.get(player.id)})`;
            }
            
            message += `- ${playerName} (${player.cards.length} карт)`;
            
            message += `\n`;
        }
    }
    message += `Очки в раунде: ${state.teams.team1.score}\n`;
    message += `Взятки: ${state.teams.team1.tricks}\n`;
    message += `Глаза: ${state.teams.team1.eyes}\n\n`;

    message += '👥 Команда 2:\n';
    for (const playerId of state.teams.team2.players.map(p => p.id)) {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
            let playerName = player.username;
            
            // Показываем значок козыря для держателя валета крести
            if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            // Добавляем информацию о мастях игроков только после первого раунда
            if (state.currentRound > 1 && state.playerSuitMap && state.playerSuitMap.has(player.id)) {
                playerName += ` (${state.playerSuitMap.get(player.id)})`;
            }
            
            message += `- ${playerName} (${player.cards.length} карт)`;
            
            message += `\n`;
        }
    }
    message += `Очки в раунде: ${state.teams.team2.score}\n`;
    message += `Взятки: ${state.teams.team2.tricks}\n`;
    message += `Глаза: ${state.teams.team2.eyes}\n\n`;

    // Информация о текущем ходе
    if (state.tableCards.length > 0) {
        message += '🎮 На столе:\n';
        state.tableCards.forEach(tableCard => {
            if (!tableCard) return; // Пропускаем, если карта не определена
            
            const player = state.players.find(p => p && p.id === tableCard.playerId);
            if (player) {
                message += `${player.username}: ${tableCard.card.suit}${tableCard.card.rank}\n`;
            } else {
                message += `Неизвестный игрок: ${tableCard.card.suit}${tableCard.card.rank}\n`;
            }
        });
    }

    // Информация о текущем игроке
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer) {
        message += `\n🎯 Сейчас ход: @${currentPlayer.username}`;
    }

    return message;
}

// После импортов добавим объявление типа для InlineQueryResultCachedSticker
interface InlineQueryResultCachedSticker {
    type: 'sticker';
    id: string;
    sticker_file_id: string;
    input_message_content?: {
        message_text: string;
    };
}

// Модифицируем функцию отправки карт игрока в виде стикеров
async function sendPlayerCardsAsStickers(ctx: any, player: Player, gameState: GameState) {
    try {
        // Группировка карт по масти для сортировки
        const cardsBySuit = player.cards.reduce((acc: CardsBySuit, card) => {
            if (!acc[card.suit]) {
                acc[card.suit] = [];
            }
            acc[card.suit]!.push(card);
            return acc;
        }, {});

        // Сортировка карт в каждой масти по значению
        Object.values(cardsBySuit).forEach(cards => {
            cards?.sort((a, b) => a.value - b.value);
        });

        // Объединяем все карты в отсортированном порядке
        const sortedCards: Card[] = [];
        const suits: CardSuit[] = ['♠', '♣', '♦', '♥'];
        
        for (const suit of suits) {
            const cardsInSuit = cardsBySuit[suit];
            if (cardsInSuit && cardsInSuit.length > 0) {
                sortedCards.push(...cardsInSuit);
            }
        }

        // Отправляем стикеры для каждой карты
        if (sortedCards.length > 0) {
            // Обновляем информацию о картах игрока в хранилище
            playerCardsInPrivateChat.set(player.id, {
                cards: [...sortedCards], // Копируем массив
                gameId: ctx.chat?.id // Используем chatId из контекста вместо gameState.chatId
            });
            
            // Добавляем информацию об inline режиме
            await ctx.reply('Ваши карты (используйте стикеры для хода):\n\nЧтобы быстро выбрать карту, начните писать @ваш_бот в чате и выберите карту из появившейся панели.');
            
            for (const card of sortedCards) {
                const stickerKey = `${card.suit}${card.rank}`;
                const stickerId = cardStickers[stickerKey];
                
                if (stickerId) {
                    // Сохраняем индекс карты в player.cards для дальнейшего использования
                    const index = player.cards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
                    
                    // Отправляем стикер
                    await ctx.replyWithSticker(stickerId);
                } else {
                    console.error(`Стикер для карты ${stickerKey} не найден`);
                }
            }
        } else {
            await ctx.reply('У вас нет карт');
            
            // Очищаем информацию о картах в хранилище
            playerCardsInPrivateChat.delete(player.id);
        }
    } catch (error) {
        console.error('Ошибка при отправке стикеров карт:', error);
        await ctx.reply('Произошла ошибка при отправке карт');
    }
}

// Обработчик стикеров и текста для ходов в игре
bot.on(['sticker', 'text'], async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        const userId = ctx.from?.id;
        if (!chatId || !userId) return;
        
        // Используем ChatManager для получения актуального ID чата
        const actualChatId = chatManager.getActualChatId(chatId);
        
        // Проверяем, является ли сообщение стикером или текстом с информацией о карте
        let stickerId: string | null = null;
        let fileUniqueId: string | null = null;
        let cardInfo: { suit: CardSuit, rank: CardRank } | null = null;
        
        if ('sticker' in ctx.message) {
            // Если это стикер
            stickerId = ctx.message.sticker.file_id;
            fileUniqueId = ctx.message.sticker.file_unique_id;
            
            // Логирование стикера
            console.log(`[LOG] Получен стикер с ID: ${stickerId}`);
            console.log(`[LOG] Стикер от пользователя: ${userId}, в чате: ${actualChatId}`);
            
            // Ищем карту по стикеру
            if (stickerId && stickerToCard.has(stickerId)) {
                cardInfo = stickerToCard.get(stickerId) || null;
            } else if (fileUniqueId && uniqueIdToCard.has(fileUniqueId)) {
                cardInfo = uniqueIdToCard.get(fileUniqueId) || null;
            }
        } else if ('text' in ctx.message) {
            // Если это текстовое сообщение, проверяем, содержит ли оно информацию о карте
            const cardMatch = ctx.message.text.match(/[♠♣♦♥][7-9JQKA]|[♠♣♦♥]10/);
            
            if (ctx.message.text.startsWith(EMOJI_PREFIX)) {
                const emoji = ctx.message.text.slice(EMOJI_PREFIX.length);
                const resolved = getCardByEmoji(actualChatId, emoji);
                if (resolved) {
                  console.log(`[LOG] Эмодзи-токен распознан: ${emoji} -> ${resolved.suit}${resolved.rank}`);
                  cardInfo = { suit: resolved.suit, rank: resolved.rank } as { suit: CardSuit, rank: CardRank };
                } else {
                  console.log(`[LOG] Эмодзи-токен ${emoji} не найден в текущем сторе`);
                  await ctx.reply('Этот выбор недействителен для текущей раздачи.');
                  return;
                }
            } else if (cardMatch) {
                const card = cardMatch[0];
                const suit = card[0] as CardSuit;
                const rank = card.substring(1) as CardRank;
                
                console.log(`[LOG] Найдена карта в тексте: ${suit}${rank}`);
                cardInfo = { suit, rank };
            } else {
                // Это обычное текстовое сообщение, пропускаем
                return;
            }
        } else {
            // Не стикер и не текст с информацией о карте, пропускаем
            return;
        }
        
        // Проверка на игру в обоих ID (старом и новом)
        let game = games.get(actualChatId);
        
        // Если игры нет с актуальным ID, проверяем старый ID
        if (!game && chatId !== actualChatId) {
            game = games.get(chatId);
            if (game) {
                // Если нашли игру со старым ID, переносим её на новый
                games.set(actualChatId, game);
                games.delete(chatId);
                console.log(`[MIGRATION] Игра перенесена со старого ID ${chatId} на новый ${actualChatId}`);
            }
        }
        
        if (!game) {
            console.log(`[LOG] Игра не найдена в чате ${actualChatId}`);
            return; // Игры нет, просто пропускаем стикер
        }

        // Получаем состояние игры
        const gameState = game.getGameState();
        if (!gameState.isActive) {
            console.log(`[LOG] Игра не активна в чате ${actualChatId}`);
            return; // Игра не активна, пропускаем
        }

        // Получаем текущего игрока
        const currentPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        console.log(`[LOG] Текущий ход игрока: ${currentPlayer?.username} (ID: ${currentPlayerId})`);
        
        if (!currentPlayer) {
            console.log(`[LOG] Текущий игрок не найден`);
            return;
        }

        // Проверяем, чей сейчас ход
        if (userId !== currentPlayerId) {
            console.log(`[LOG] Не ход пользователя ${userId}, сейчас ход игрока ${currentPlayer.username}`);
            await ctx.reply(`Сейчас ход игрока ${currentPlayer.username}`);
            return;
        }

        if (cardInfo) {
            console.log(`[LOG] Определена карта: ${cardInfo.suit}${cardInfo.rank}`);
            
            // Находим индекс карты в руке игрока
            const cardIndex = currentPlayer.cards.findIndex(c => 
                c.suit === cardInfo!.suit && c.rank === cardInfo!.rank);
            
            console.log(`[LOG] Индекс карты в руке игрока: ${cardIndex}`);
            console.log(`[LOG] Карты игрока:`, currentPlayer.cards.map(c => `${c.suit}${c.rank}`).join(', '));
            
            if (cardIndex === -1) {
                console.log(`[LOG] Карта не найдена в руке игрока ${currentPlayer.username}`);
                await ctx.reply(`У вас нет такой карты`);
                return;
            }

            // Логируем информацию о ходе
            console.log(`[LOG] Делаем ход игроком ${currentPlayer.username} картой ${cardInfo.suit}${cardInfo.rank} (индекс: ${cardIndex})`);
            
            // Делаем ход и получаем результат
            const result = await game.makeMove(currentPlayer.id, cardIndex);
            
            console.log(`[LOG] Результат хода:`, JSON.stringify(result, null, 2));
            
            // Добавляем детальное логирование объекта result
            console.log(`[LOG] Свойства объекта result:`);
            console.log(`- success: ${result.success}`);
            console.log(`- message: ${result.message || 'отсутствует'}`);
            console.log(`- isRoundComplete: ${result.isRoundComplete}`);
            console.log(`- isGameRoundComplete: ${result.isGameRoundComplete}`);
            console.log(`- roundSummary: ${result.roundSummary ? 'присутствует' : 'отсутствует'}`);
            console.log(`- roundResults: ${result.roundResults ? 'присутствует' : 'отсутствует'}`);
            
            if (!result.success) {
                console.log(`[LOG] Ход не удался: ${result.message}`);
                await ctx.reply(result.message || 'Не удалось сделать ход');
                return;
            }

            // Очищаем таймер текущего игрока, так как ход был сделан
            clearMoveTimer(actualChatId);

            // Добавляем подробное логирование
            console.log(`[LOG] isRoundComplete: ${result.isRoundComplete}`);
            console.log(`[LOG] isGameRoundComplete: ${result.isGameRoundComplete}`);
            console.log(`[LOG] roundSummary exists: ${!!result.roundSummary}`);
            console.log(`[LOG] roundResults exists: ${!!result.roundResults}`);

            // Если раунд завершен, отправляем сводку
            if (result.isRoundComplete && result.roundSummary) {
                console.log(`[LOG] Отправка сводки раунда: ${result.roundSummary.substring(0, 50)}...`);
                await ctx.reply(result.roundSummary, {
                  reply_markup: {
                      inline_keyboard: [[
                          { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                      ]]
                  }
              });
                
                // Если раунд игры завершен (все карты сыграны), отправляем результаты раунда
                if (result.isGameRoundComplete && result.roundResults) {
                    console.log(`[LOG] Отправка результатов раунда: ${result.roundResults.substring(0, 50)}...`);
                    await ctx.reply(result.roundResults, {
                      reply_markup: {
                          inline_keyboard: [[
                              { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                          ]]
                      }
                  });
                } else if (result.roundResults) {
                    // Отправляем результаты раунда даже если isGameRoundComplete не установлено,
                    // но результаты есть (возможный баг)
                    console.log(`[LOG] isGameRoundComplete не установлено, но есть результаты раунда - отправляем`);
                    await ctx.reply(result.roundResults);
                } else {
                    console.log(`[LOG] Внимание: результаты раунда не отправлены. isGameRoundComplete: ${result.isGameRoundComplete}, roundResults: ${!!result.roundResults}`);
                }
            }

            // Получаем обновленное состояние игры для формирования сообщения
            const updatedState = game.getGameState();
            const newCurrentPlayer = updatedState.players[updatedState.currentPlayerIndex];

            // Отправляем сообщение о ходе только если раунд не завершен
            if (!result.isRoundComplete) {
                // Формируем сообщение о ходе в новом формате
                let moveMessage = '🎮 На столе:\n';
                updatedState.tableCards.forEach(tableCard => {
                    if (!tableCard) return; // Пропускаем, если карта не определена
                    
                    const player = updatedState.players.find(p => p && p.id === tableCard.playerId);
                    if (player) {
                        moveMessage += `${player.username}: ${tableCard.card.suit}${tableCard.card.rank}\n`;
                    } else {
                        moveMessage += `Неизвестный игрок: ${tableCard.card.suit}${tableCard.card.rank}\n`;
                    }
                });

                // Добавляем информацию о следующем игроке
                if (newCurrentPlayer) {
                    moveMessage += `\n🎯 Сейчас ход: @${newCurrentPlayer.username}`;
                    
                    // Проверяем, включены ли таймеры в этом чате
                    const hasActiveTimer = activeTimers.has(actualChatId);
                    if (hasActiveTimer) {
                        // Устанавливаем таймер для следующего игрока
                        setMoveTimer(actualChatId, newCurrentPlayer.id);
                        moveMessage += `\n⏰ У игрока есть 30 секунд на ход`;
                    }
                }

                await ctx.reply(moveMessage, {
                  reply_markup: {
                      inline_keyboard: [[
                          { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                      ]]
                  }
                });
            }

            // Обновляем карты в хранилище для всех игроков
            updatedState.players.forEach(player => {
                if (player.cards.length > 0) {
                    playerCardsInPrivateChat.set(player.id, {
                        cards: [...player.cards],
                        gameId: actualChatId // Используем actualChatId вместо chatId
                    });
                } else {
                    playerCardsInPrivateChat.delete(player.id);
                }
            });
        } else {
            // Стикер не распознан как карта
            console.log(`[LOG] Не удалось определить карту по стикеру или тексту`);
            
            if ('sticker' in ctx.message) {
                await ctx.reply('Этот стикер не распознан как карта. Используйте только стикеры карт, отправленные ботом.');
            }
            return;
        }
    } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
        await ctx.reply('Произошла ошибка при обработке сообщения');
    }
});

// Запускаем бота
bot.launch().then(async () => {
    console.log('Бот запущен!');
    
    try {
        // Проверяем и включаем инлайн-режим
        const botInfo = await bot.telegram.getMe();
        console.log(`Бот ${botInfo.username} успешно запущен!`);
        
        console.log(`Для активации инлайн-режима, если он еще не активирован:`);
        console.log(`1. Откройте чат с @BotFather в Telegram`);
        console.log(`2. Отправьте команду /mybots`);
        console.log(`3. Выберите вашего бота @${botInfo.username}`);
        console.log(`4. Нажмите на "Bot Settings"`);
        console.log(`5. Нажмите на "Inline Mode"`);
        console.log(`6. Нажмите на "Turn on" и настройте параметры инлайн-режима`);
    } catch (err) {
        console.error('Ошибка при получении информации о боте:', err);
    }
}).catch(err => {
    console.error('Ошибка при запуске бота:', err);
});

// Добавим команду для получения инструкции по активации инлайн-режима
bot.command('inline_setup', async (ctx) => {
    try {
        const botInfo = await ctx.telegram.getMe();
        
        await ctx.reply(`Инструкция по активации инлайн-режима для бота:

1. Откройте чат с @BotFather в Telegram
2. Отправьте команду /mybots
3. Выберите вашего бота @${botInfo.username}
4. Нажмите на "Bot Settings"
5. Нажмите на "Inline Mode"
6. Нажмите на "Turn on" и настройте параметры инлайн-режима
7. В строке "Placeholder" напишите "Выберите карту для хода..."
8. Перезапустите бота после настройки`);
    } catch (error) {
        console.error('Ошибка при выполнении команды inline_setup:', error);
        await ctx.reply('Произошла ошибка при получении информации о боте');
    }
});

// Обработка остановки бота
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
