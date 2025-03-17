import { Telegraf, Markup, Context } from 'telegraf';
import dotenv from 'dotenv';
import { BelkaGame } from './game/BelkaGame';
import { Player, CardSuit, Card, TableCard, GameState, CardRank } from './types/game.types';
import { Message } from 'telegraf/typings/core/types/typegram';

// Загружаем переменные окружения
dotenv.config();

// Инициализируем бота
const bot = new Telegraf(process.env['BOT_TOKEN'] || '');

// Хранилище игр
const games = new Map<number, BelkaGame>();

// Интерфейс для группировки карт по масти
interface CardsBySuit {
    [suit: string]: Card[] | undefined;
}

// Создаем карту соответствия стикеров и карт
// Здесь нужно будет заменить ID стикеров на реальные
const stickerToCardMap: Record<string, { suit: CardSuit, rank: CardRank }> = {
    // Пики
    'CAACAgUAAxkBAAEOAAFuZ8rXHKviT8wWqbN71LkEeJbfQU8AAl8BAAJXKsFVmCgOgGg3izQ2BA': { suit: '♠', rank: '7' },
    'CAACAgUAAxkBAAEOAAG5Z8rbFgooaxG8PgSj00AJ6Aw4rP4AAuYBAAKRgMBVWF82EYOZdoU2BA': { suit: '♠', rank: '8' },
    'CAACAgUAAxkBAAEOAAGxZ8ra7-DmmwzFDaWIzQEhoMSAKx8AAkwBAAJU28FVDonnJNmkT3Q2BA': { suit: '♠', rank: '9' },
    'CAACAgUAAxkBAAEOAAGGZ8rYRg4U4r4xqEQnZW79yAdzfEUAAqkCAAKJk8BVWKACYfdlBS42BA': { suit: '♠', rank: 'Q' },
    'CAACAgUAAxkBAAEOAAF8Z8rYE3OCuEattuBvv4S2nTxeiuEAAqUBAAJracBV4KO0jSwLIKg2BA': { suit: '♠', rank: 'K' },
    'CAACAgUAAxkBAAEOAAFvZ8rXHm2mVerucm5KAm88kMDkf1YAAn4BAAIxHHFWq8dGgQlOwdw2BA': { suit: '♠', rank: '10' },
    'CAACAgUAAxkBAAEOAAFyZ8rXKX09LEf41Eero94I6QQLS1EAAnsBAAKAmcBV4Pja_u4WWqA2BA': { suit: '♠', rank: 'A' },
    'CAACAgUAAxkBAAEOAAGQZ8rYl72iZYTvgqC7ZuW6E2IiC1MAAoEBAAINc8BVaizyV0qGNqw2BA': { suit: '♠', rank: 'J' },
    
    // Крести
    'CAACAgUAAxkBAAEOAAHFZ8rbWOvmM1zFyg46IaArfVUXdUkAAukAA5qcwFX6noyk7wNPcTYE': { suit: '♣', rank: '7' },
    'CAACAgUAAxkBAAEOAAG9Z8rbLqotiveOREiFX8_G0fifgFQAAmUBAAJrJ8BV8w21Lza5UiA2BA': { suit: '♣', rank: '8' },
    'CAACAgUAAxkBAAEOAAG3Z8rbDtaNqtsnbQGCpvYWm1mF4cEAAh8BAAKD08FV9F20nWGU8Gs2BA': { suit: '♣', rank: '9' },
    'CAACAgUAAxkBAAEOAAGKZ8rYUMK3k8KgBp_pTSw_mB_qrAkAAmMBAALWVMFVQfSa6-vfQwY2BA': { suit: '♣', rank: 'Q' },
    'CAACAgUAAxkBAAEOAAGCZ8rYMRTGi1LbdTSMtFaUrMUTLzsAAmoBAAK1dcBVLFMCHa2x6842BA': { suit: '♣', rank: 'K' },
    'CAACAgUAAxkBAAEOAAGtZ8ra0zE0i0mkH6elfkE53wm9rjMAAlgBAAKQjMBVapoqI7kVGZ02BA': { suit: '♣', rank: '10' },
    'CAACAgUAAxkBAAEOAAF6Z8rYBCKsGgWO8KFHl7ohpW1XIJ4AAlYBAAJOysBVHbDzvGw8t802BA': { suit: '♣', rank: 'A' },
    'CAACAgUAAxkBAAEOAAGUZ8rYrT0WPNx7Y8X1LKLfg6PSejgAAkoBAAK1UsFVpyYqzjbxrIw2BA': { suit: '♣', rank: 'J' },
    
    // Бубны
    'CAACAgUAAxkBAAEOAAHHZ8rbZVGW07-doBgczWEXCTQxO6sAAo0BAAKyVsBVtHHDHu00oCo2BA': { suit: '♦', rank: '7' },
    'CAACAgUAAxkBAAEOAAG_Z8rbOdEj03HEcOkxMi5hCj5h-AcAAl0BAAJrRMBVo6XE6k_DY-E2BA': { suit: '♦', rank: '8' },
    'CAACAgUAAxkBAAEOAAG1Z8rbBPG07oYGmbMvmxSnQahH48kAAjUBAALkJMFVVYPhaOcbV0I2BA': { suit: '♦', rank: '9' },
    'CAACAgUAAxkBAAEOAAGMZ8rYXVekwMpTrft4V9Ho_88o0OYAArgBAAK4ZcBVV7ZU4ghFpw02BA': { suit: '♦', rank: 'Q' },
    'CAACAgUAAxkBAAEOAAGEZ8rYOxaPpRA46rtyjcGngbnyXGwAAn4BAAK5_sFVgYe0fN-Fhs82BA': { suit: '♦', rank: 'K' },
    'CAACAgUAAxkBAAEOAAGvZ8ra4eD-tbwsd85yctJlNVYdSBYAAlIBAAIZW8BVfJvie1hNtSo2BA': { suit: '♦', rank: '10' },
    'CAACAgUAAxkBAAEOAAF4Z8rX9P8OdixPTK1AGDWNWRr3YzEAAkwBAAK5a8FVAoxfT_lg6mw2BA': { suit: '♦', rank: 'A' },
    'CAACAgUAAxkBAAEOAAGWZ8rYucCvRF0OG_G-OaHB40xDKD4AAk0BAAJxwslVt7QWjeVelxA2BA': { suit: '♦', rank: 'J' },
    
    // Черви
    'CAACAgUAAxkBAAEOAAHDZ8rbTEaaUU8cS9s--yu_MPE_foEAAmQBAALVfcFVXNjfiLkZcdA2BA': { suit: '♥', rank: '7' },
    'CAACAgUAAxkBAAEOAAG7Z8rbI62e-8MK74xUpt7K1SBPtQIAAlgBAAJPusFVAtHwZJpzWbw2BA': { suit: '♥', rank: '8' },
    'CAACAgUAAxkBAAEOAAGzZ8ra-bZPqaziYaRL8krintll5YAAAqQBAAKA8sFV3FfpBS5eBqM2BA': { suit: '♥', rank: '9' },
    'CAACAgUAAxkBAAEOAAGOZ8rYZ2rzB-m22OE2wRC3XYaDJEUAAlcBAAIYHsBVnCj8vzDtBQI2BA': { suit: '♥', rank: 'Q' },
    'CAACAgUAAxkBAAEOAAF-Z8rYJuo2813wswtVC92flPdShEAAAhkBAAIUU8FVo1AReO6QOhE2BA': { suit: '♥', rank: 'K' },
    'CAACAgUAAxkBAAEOAAGrZ8raydTtPPsIeQGvLozk6kN3QDkAAhEBAAJBW8BVbojfRX6TWVk2BA': { suit: '♥', rank: '10' },
    'CAACAgUAAxkBAAEOAAF2Z8rX4mmWi2M5VxHgTfdFzAgVDbEAAooBAAL0iMBVSv6OGuA80Gg2BA': { suit: '♥', rank: 'A' },
    'CAACAgUAAxkBAAEOAAGSZ8rYmbPdklc9twj1kw2YyqMJ-3wAAk8BAALmesFVXh1UMvDrQ2Q2BA': { suit: '♥', rank: 'J' },
};

// Создаем обратную карту для отправки стикеров игрокам
const cardToStickerMap: Record<string, string> = {};
Object.entries(stickerToCardMap).forEach(([stickerId, card]) => {
    const key = `${card.suit}${card.rank}`;
    cardToStickerMap[key] = stickerId;
});

// Обработчик команды /start
bot.start((ctx) => {
    ctx.reply('Добро пожаловать в игру Белка! Используйте /help для получения списка команд.');
});

// Обработчик команды /help
bot.help((ctx) => {
    const helpText = `
Белка - карточная игра для 4 игроков.

Команды:
/join - Присоединиться к игре
/startbelka - Начать игру
/cards - Показать свои карты
/state - Показать текущее состояние игры
/endgame - Проголосовать за завершение игры
/clearbot - Сбросить текущую игру (в случае проблем)

Правила игры:
- Цель: набрать 12 глаз или выиграть "голую"
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
- Если обе команды набрали по 60 очков = "яйца" (глаза не начисляются)
- Пересдача: если у игрока ≤13 очков или ≥5 карт одной масти
`;
    ctx.reply(helpText);
});

// Обработчик команды /join
bot.command('join', async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const username = ctx.from.username || ctx.from.first_name || 'Игрок';
        
        // Проверяем, есть ли уже игра для этого чата
        let game = games.get(chatId);
        
        if (!game) {
            game = new BelkaGame(chatId);
            games.set(chatId, game);
            await ctx.reply('Создана новая игра. Используйте /join, чтобы присоединиться.');
        }
        
        // Проверяем, что game.state существует
        if (!game.state) {
            await ctx.reply('Ошибка: состояние игры не инициализировано.');
            games.delete(chatId);
            return;
        }

        // Проверяем, не заполнена ли уже игра
        if (game.state.players && game.state.players.length >= 4) {
            await ctx.reply('Игра уже заполнена (4 игрока). Дождитесь окончания текущей игры.');
            return;
        }
        
        // Проверяем, не присоединился ли уже игрок
        if (game.state.players && game.state.players.some(p => p.id === userId)) {
            await ctx.reply(`${username}, вы уже присоединились к игре.`);
            return;
        }

        // Добавляем игрока
        const player: Player = {
            id: userId,
            username: username,
            cards: [],
            score: 0,
            tricks: 0,
            chatId: chatId
        };
        
        game.addPlayer(player);
        
        // Проверяем, что game.state.players существует после добавления игрока
        if (!game.state.players) {
            await ctx.reply('Ошибка: не удалось добавить игрока.');
            return;
        }
        
        await ctx.reply(`${username} присоединился к игре. Игроков: ${game.state.players.length}/4`);
        
        // Если набралось 4 игрока, предлагаем начать игру
        if (game.state.players.length === 4) {
            await ctx.reply('Набралось 4 игрока! Используйте /startbelka, чтобы начать игру.');
        }
    } catch (error) {
        console.error('Ошибка при присоединении к игре:', error);
        await ctx.reply('Произошла ошибка при присоединении к игре.');
    }
});

// Обработчик команды /startbelka
bot.command('startbelka', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        let game = games.get(chatId);
        
        if (!game) {
            await ctx.reply('Игра не найдена. Создайте новую игру с помощью /join');
            return;
        }
        
        const gameState = game.getGameState();
        
        if (gameState.isActive) {
            await ctx.reply('Игра уже запущена!');
            return;
        }
        
        if (gameState.players.length < 4) {
            await ctx.reply(`Недостаточно игроков! Текущее количество: ${gameState.players.length}/4`);
            return;
        }
        
        // Запускаем игру
        game.startGame();
        
        // Получаем обновленное состояние игры
        const updatedState = game.getGameState();
        // Преобразуем Map в Record для playerSuitMap
        const stateForPublic = {
            ...updatedState,
            playerSuitMap: Object.fromEntries(updatedState.playerSuitMap)
        };
        
        // Отправляем общее состояние игры в чат
        await ctx.reply(getPublicGameState(stateForPublic));
        
        // Отправляем сообщение о том, что игроки могут посмотреть свои карты
        await ctx.reply('Игра началась! Используйте команду /cards, чтобы увидеть свои карты и сделать ход.');
    } catch (error) {
        console.error('Ошибка в команде /startbelka:', error);
        await ctx.reply('Произошла ошибка при запуске игры');
    }
});

// Обработчик команды /cards
bot.command('cards', async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        
        // Проверяем, есть ли активная игра
        const game = games.get(chatId);
        if (!game) {
            await ctx.reply('Нет активной игры. Начните игру с помощью /startbelka');
            return;
        }
        
        // Проверяем, что game.state существует
        if (!game.state) {
            await ctx.reply('Ошибка: состояние игры не инициализировано.');
            games.delete(chatId);
            return;
        }
        
        // Проверяем, является ли пользователь игроком
        if (!game.state.players) {
            await ctx.reply('Ошибка: список игроков не инициализирован.');
            return;
        }
        
        const player = game.state.players.find(p => p && p.id === userId);
        if (!player) {
            await ctx.reply('Вы не участвуете в этой игре.');
            return;
        }
        
        // Отправляем карты игроку
        await sendPlayerCards(bot, player, {
            ...game.state,
            playerSuitMap: Object.fromEntries(game.state.playerSuitMap)
        });
        
        // Пытаемся удалить сообщение с командой из группового чата, если это возможно
        // Но игнорируем ошибки удаления
        if (ctx.message && ctx.chat.type !== 'private') {
            try {
                await ctx.deleteMessage();
            } catch (error) {
                // Игнорируем ошибку удаления сообщения
                console.log('Не удалось удалить сообщение. Это нормально.');
            }
        }
        
        // Если мы в групповом чате, отправляем подтверждение
        if (ctx.chat.type !== 'private') {
            await ctx.reply(`${player.username}, ваши карты отправлены в личные сообщения.`);
        }
    } catch (error) {
        console.error('Ошибка при отправке карт:', error);
        await ctx.reply('Произошла ошибка при отправке карт.');
    }
});

// Обработчик для показа карт игрока
bot.action(/show_cards_(\d+)/, async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        const userId = ctx.from?.id;
        
        if (!chatId || !userId) return;
        
        const playerId = parseInt(ctx.match[1]);
        
        const game = games.get(chatId);
        if (!game) {
            await ctx.answerCbQuery('Игра не найдена');
            return;
        }

        const gameState = game.getGameState();
        const player = gameState.players.find(p => p.id === playerId);
        
        if (!player) {
            await ctx.answerCbQuery('Игрок не найден');
            return;
        }
        
        // Проверяем, что запрос сделал владелец карт
        if (userId !== playerId) {
            await ctx.answerCbQuery('Вы не можете смотреть карты других игроков');
            return;
        }
        
        // Формируем сообщение с картами игрока
        const stateForFormatting = {
            ...gameState,
            playerSuitMap: Object.fromEntries(gameState.playerSuitMap)
        };
        const cardsMessage = formatPlayerCards(player, stateForFormatting);
        
        // Показываем карты в виде всплывающего уведомления
        await ctx.answerCbQuery(cardsMessage, { show_alert: true });
        // Отправляем кнопки для хода
        const stateForButtons = {
            ...gameState,
            playerSuitMap: Object.fromEntries(gameState.playerSuitMap)
        };
        const buttons = createCardButtons(player, stateForButtons);
        await ctx.editMessageText(`Карты игрока ${player.username}:`, buttons);
        
    } catch (error) {
        console.error('Ошибка при показе карт:', error);
        await ctx.answerCbQuery('Произошла ошибка при отображении карт');
    }
});

// Обработчик для хода картой
bot.action(/play_card_(\d+)_(\d+)/, async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        const userId = ctx.from?.id;
        
        if (!chatId || !userId) return;
        
        const playerId = parseInt(ctx.match[1]);
        const cardIndex = parseInt(ctx.match[2]);
        
        const game = games.get(chatId);
        if (!game) {
            await ctx.answerCbQuery('Игра не найдена');
            return;
        }

        const gameState = game.getGameState();
        
        // Проверяем, что запрос сделал владелец карт
        if (userId !== playerId) {
            await ctx.answerCbQuery('Вы не можете ходить картами других игроков');
            return;
        }
        
        // Проверяем, что сейчас ход этого игрока
        if (gameState.currentPlayerIndex === undefined || 
            gameState.currentPlayerIndex < 0 || 
            gameState.currentPlayerIndex >= gameState.players.length || 
            gameState.players[gameState.currentPlayerIndex].id !== playerId) {
            await ctx.answerCbQuery('Сейчас не ваш ход');
            return;
        }
        
        // Делаем ход
        try {
            const result = game.makeMove(playerId, cardIndex);
            await ctx.answerCbQuery(result.message || (result.success ? 'Ход сделан' : 'Не удалось сделать ход'));
            
            // Отправляем обновленное состояние игры всем игрокам
            for (const p of gameState.players) {
                if (p) {
                    await sendPlayerCards(bot, p, {
                        ...game.state,
                        playerSuitMap: Object.fromEntries(game.state.playerSuitMap)
                    });
                }
            }
            
            // Отправляем обновленное состояние игры в групповой чат
            await ctx.editMessageText(getPublicGameState({
                ...game.state,
                playerSuitMap: Object.fromEntries(game.state.playerSuitMap)
            }));
            
            // Если игра завершена после этого хода, выводим итоговый результат
            if (!game.state.isActive) {
                const winningTeam = game.state.teams && game.state.teams.team1 && game.state.teams.team1.eyes >= 12 ? 1 : 
                                   game.state.teams && game.state.teams.team2 && game.state.teams.team2.eyes >= 12 ? 2 : 0;
                
                let endMessage = '🏆 Игра завершена!\n\n';
                
                if (winningTeam === 1 && game.state.teams && game.state.teams.team1) {
                    endMessage += `Победила Команда 1 с ${game.state.teams.team1.eyes} глазами!`;
                } else if (winningTeam === 2 && game.state.teams && game.state.teams.team2) {
                    endMessage += `Победила Команда 2 с ${game.state.teams.team2.eyes} глазами!`;
                } else {
                    endMessage += 'Игра завершена без победителя.';
                }
                
                await bot.telegram.sendMessage(chatId, endMessage);
                
                // Удаляем игру из хранилища
                games.delete(chatId);
            }
        } catch (error) {
            if (error instanceof Error) {
                await ctx.answerCbQuery(`Ошибка: ${error.message}`);
            } else {
                await ctx.answerCbQuery('Произошла неизвестная ошибка');
            }
        }
    } catch (error) {
        console.error('Ошибка при ходе картой:', error);
        await ctx.answerCbQuery('Произошла ошибка при ходе картой');
    }
});

// Обработчик команды /state
bot.command('state', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        const game = games.get(chatId);
        if (!game) {
            await ctx.reply('Игра не найдена. Начните новую игру с помощью /startbelka');
            return;
        }
        const gameState = game.getGameState();
        await ctx.reply(getPublicGameState({
            ...gameState,
            playerSuitMap: Object.fromEntries(gameState.playerSuitMap)
        }));
    } catch (error) {
        console.error('Ошибка в команде /state:', error);
        await ctx.reply('Произошла ошибка при получении состояния игры');
    }
});

// Обработчик команды /endgame
bot.command('endgame', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('Не удалось определить пользователя');
            return;
        }

        const game = games.get(chatId);
        if (!game) {
            await ctx.reply('Игра не найдена. Начните новую игру с помощью /startbelka');
            return;
        }

        const result = game.voteForEnd(userId);

        switch (result.status) {
            case 'not_player':
                await ctx.reply('Вы не являетесь участником игры или игра не активна');
                break;
            case 'already_voted':
                await ctx.reply('Вы уже проголосовали за завершение игры');
                break;
            case 'voted':
                await ctx.reply(`Вы проголосовали за завершение игры. Голосов: ${result.votesCount}/${result.requiredVotes}`);
                
                if (result.gameEnded) {
                    await ctx.reply('Игра завершена по результатам голосования!');
                    
                    // Получаем обновленное состояние игры
                    const updatedState = game.getGameState();
                    // Отправляем итоговое состояние игры
                    await ctx.reply(getPublicGameState({
                        ...updatedState,
                        playerSuitMap: Object.fromEntries(updatedState.playerSuitMap)
                    }));
                }
                break;
        }
    } catch (error) {
        console.error('Ошибка в команде /endgame:', error);
        await ctx.reply('Произошла ошибка при голосовании за завершение игры');
    }
});

// Обработчик команды /clearbot
bot.command('clearbot', async (ctx) => {
    try {
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('Не удалось определить пользователя');
            return;
        }

        // Проверяем, существует ли игра для этого чата
        const gameExists = games.has(chatId);
        
        if (gameExists) {
            // Удаляем игру из хранилища
            games.delete(chatId);
            await ctx.reply('🧹 Игра успешно сброшена. Используйте /join, чтобы начать новую игру.');
        } else {
            await ctx.reply('Активной игры не найдено. Используйте /join, чтобы начать новую игру.');
        }
    } catch (error) {
        console.error('Ошибка в команде /clearbot:', error);
        await ctx.reply('Произошла ошибка при сбросе игры');
    }
});

// Функция для форматирования сообщения с картами игрока
function formatPlayerCards(player: Player, state: GameState): string {
    if (!player || !player.cards) {
        return 'Ошибка: карты не найдены';
    }
    
    let message = `Ваши карты (всего ${player.cards.length}):\n`;
    
    // Группируем и сортируем карты по масти
    const cardsBySuit = player.cards.reduce((acc: CardsBySuit, card) => {
        if (!card) return acc;
        
        if (!acc[card.suit]) {
            acc[card.suit] = [];
        }
        acc[card.suit]!.push(card);
        return acc;
    }, {});

    // Сортируем карты в каждой масти по значению
    Object.values(cardsBySuit).forEach(cards => {
        if (cards) {
            cards.sort((a, b) => getCardValue(a) - getCardValue(b));
        }
    });

    // Отображаем карты по мастям
    const suits: CardSuit[] = ['♠', '♣', '♦', '♥'];
    suits.forEach(suit => {
        if (cardsBySuit[suit] && cardsBySuit[suit]!.length > 0) {
            message += `\n${suit}: `;
            cardsBySuit[suit]!.forEach(card => {
                const index = player.cards.findIndex(c => c === card) + 1;
                message += `${card.rank} `;
            });
        }
    });

    message += `\n\n${state.trump === null ? 'Козырей нет' : `Козырь: ${state.trump}`}`;
    
    // Показываем информацию о держателе валета крести только после первого раунда
    if (state.clubJackHolder && state.hideClubJackHolder !== undefined && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
        message += ` (ваш козырь)`;
    }
    
    const currentPlayer = state.players[state.currentPlayerIndex];
    const isCurrentPlayer = currentPlayer && currentPlayer.id === player.id;
    
    if (isCurrentPlayer) {
        message += '\n\n🎯 Сейчас ваш ход!';
        
        if (state.tableCards && state.tableCards.length > 0 && state.tableCards[0] && state.tableCards[0].card) {
            const firstCard = state.tableCards[0].card;
            const hasSuit = player.cards.some(c => c && c.suit === firstCard.suit);
            message += `\n❗️ Масть хода: ${firstCard.suit}${hasSuit ? ' (нужно ходить в масть)' : ''}`;
        }
    } else {
        message += '\n\nОжидайте свой ход...';
    }

    if (state.tableCards && state.tableCards.length > 0) {
        message += '\n\nНа столе:';
        state.tableCards.forEach(tableCard => {
            if (!tableCard) return;
            
            const p = state.players.find(p => p && p.id === tableCard.playerId);
            if (p) {
                message += `\n${p.username}: ${tableCard.card.suit}${tableCard.card.rank}`;
            } else {
                message += `\nНеизвестный игрок: ${tableCard.card.suit}${tableCard.card.rank}`;
            }
        });
    }
    
    return message;
}

// Функция для получения значения карты для сортировки
function getCardValue(card: Card): number {
    const values: { [key in CardRank]: number } = {
        '7': 7, '8': 8, '9': 9, 
        'Q': 10, 'K': 11, '10': 12, 
        'A': 13, 'J': 14
    };
    return values[card.rank] || 0;
}

// Функция для создания кнопок с картами
function createCardButtons(player: Player, gameState: GameState) {
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

    // Создаем кнопки для каждой масти
    const buttons = [];
    const suits: CardSuit[] = ['♠', '♣', '♦', '♥'];
    
    for (const suit of suits) {
        const cardsInSuit = cardsBySuit[suit];
        if (cardsInSuit && cardsInSuit.length > 0) {
            const suitButtons = cardsInSuit.map(card => {
                const index = player.cards.findIndex(c => c === card);
                // Добавляем ID игрока в callback data
                return Markup.button.callback(`${suit}${card.rank}`, `play_card_${player.id}_${index}`);
            });
            buttons.push(suitButtons);
        }
    }

    // Добавляем кнопку для обновления карт
    buttons.push([
        Markup.button.callback('🔄 Обновить карты', `show_cards_${player.id}`)
    ]);

    return Markup.inlineKeyboard(buttons);
}

// Функция для получения публичного состояния игры
function getPublicGameState(state: GameState): string {
    let message = `🃏 Раунд ${state.currentRound}\n`;
    message += `♠️♣️♦️♥️ Козырь: ${state.trump}`;
    
    // Показываем информацию о держателе валета крести только после первого раунда
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
            
            // Показываем информацию о козыре игрока только после первого раунда
            if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            message += `- ${playerName} (${player.cards.length} карт)`;
            
            // Добавляем информацию о масти игрока
            if (state.initialClubJackHolder && player.id === state.initialClubJackHolder.id) {
                message += ` (♣)`;
            } else if (state.playerSuitMap && state.playerSuitMap[player.id]) {
                message += ` (${state.playerSuitMap[player.id]})`;
            }
            
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
            
            // Показываем информацию о козыре игрока только после первого раунда
            if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            message += `- ${playerName} (${player.cards.length} карт)`;
            
            // Добавляем информацию о масти игрока
            if (state.initialClubJackHolder && player.id === state.initialClubJackHolder.id) {
                message += ` (♣)`;
            } else if (state.playerSuitMap && state.playerSuitMap[player.id]) {
                message += ` (${state.playerSuitMap[player.id]})`;
            }
            
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
        message += `\n🎯 Сейчас ход: ${currentPlayer.username}`;
        message += `\nИспользуйте команду /cards, чтобы увидеть свои карты и сделать ход.`;
    }

    return message;
}

// Обработчик стикеров
bot.on('sticker', async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const stickerId = ctx.message.sticker.file_id;
        
        // Проверяем, есть ли активная игра в этом чате
        const game = games.get(chatId);
        if (!game) {
            return;
        }
        
        // Проверяем, является ли отправитель игроком
        const player = game.state.players.find(p => p.id === userId);
        if (!player) {
            return;
        }
        
        // Проверяем, соответствует ли стикер карте
        const cardInfo = stickerToCardMap[stickerId];
        if (!cardInfo) {
            await ctx.reply('Этот стикер не соответствует ни одной карте.');
            return;
        }
        
        // Находим индекс карты в руке игрока
        const cardIndex = player.cards.findIndex(
            card => card.suit === cardInfo.suit && card.rank === cardInfo.rank
        );
        
        if (cardIndex === -1) {
            await ctx.reply('У вас нет такой карты.');
            return;
        }
        
        // Проверяем, может ли игрок сделать ход
        if (game.state.players[game.state.currentPlayerIndex].id !== userId) {
            await ctx.reply('Сейчас не ваш ход.');
            return;
        }
        
        // Делаем ход
        try {
            const result = await game.makeMove(userId, cardIndex);
            await ctx.reply(result.message || (result.success ? 'Ход сделан' : 'Не удалось сделать ход'));
            
            // Отправляем обновленное состояние игры всем игрокам
            for (const player of game.state.players) {
                await sendPlayerCards(bot, player, {
                    ...game.state,
                    playerSuitMap: Object.fromEntries(game.state.playerSuitMap)
                });
            }
            
            // Отправляем обновленное состояние игры в групповой чат
            await ctx.reply(getPublicGameState({
                ...game.state,
                playerSuitMap: Object.fromEntries(game.state.playerSuitMap)
            }));
        } catch (error: unknown) {
            if (error instanceof Error) {
                await ctx.reply(`Ошибка: ${error.message}`);
            } else {
                await ctx.reply('Произошла неизвестная ошибка');
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Ошибка при обработке стикера:', error);
        } else {
            console.error('Неизвестная ошибка при обработке стикера');
        }
    }
});

// Обновляем функцию отправки карт игроку
async function sendPlayerCards(bot: Telegraf, player: Player, state: GameState): Promise<void> {
    try {
        if (!state || !player) {
            console.error('Ошибка: state или player не определены');
            return;
        }
        
        // Формируем сообщение с картами игрока
        const message = formatPlayerCards(player, state);
        
        // Создаем кнопки для хода
        const buttons = createCardButtons(player, state);
        
        // Отправляем сообщение с кнопками
        await bot.telegram.sendMessage(player.id, message, buttons);
    } catch (error) {
        console.error(`Ошибка отправки карт игроку ${player.username}:`, error);
    }
}

// Запускаем бота
bot.launch().then(() => {
    console.log('Бот запущен!');
}).catch(err => {
    console.error('Ошибка при запуске бота:', err);
});

// Обработка остановки бота
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));