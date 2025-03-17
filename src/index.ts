import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { BelkaGame } from './game/BelkaGame';
import { Player, CardSuit, Card, TableCard, GameState } from './types/game.types';

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
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        const userId = ctx.from?.id;
        const username = ctx.from?.username || `Player${userId}`;
        
        if (!userId) {
            await ctx.reply('Не удалось определить пользователя');
            return;
        }

        let game = games.get(chatId);
        if (!game) {
            game = new BelkaGame(chatId);
            games.set(chatId, game);
            await ctx.reply('Создана новая игра. Вы присоединились к игре.');
        } else {
            const gameState = game.getGameState();
            if (gameState.isActive) {
                await ctx.reply('Игра уже запущена! Дождитесь окончания текущей игры.');
                return;
            }

            if (gameState.players.some(p => p.id === userId)) {
                await ctx.reply('Вы уже присоединились к игре!');
                return;
            }

            if (gameState.players.length >= 4) {
                await ctx.reply('Игра уже заполнена! Максимум 4 игрока.');
                return;
            }

            const success = game.addPlayer({ id: userId, username, chatId });
            if (success) {
                await ctx.reply(`${username} присоединился к игре!`);
            } else {
                await ctx.reply('Не удалось присоединиться к игре.');
            }
        }

        // Показываем текущих игроков
        const gameState = game.getGameState();
        let playersList = 'Текущие игроки:\n';
        gameState.players.forEach((player, index) => {
            playersList += `${index + 1}. ${player.username}\n`;
        });
        
        await ctx.reply(playersList);
        
        if (gameState.players.length === 4) {
            await ctx.reply('Все игроки присоединились! Используйте /startbelka для начала игры.');
        } else {
            await ctx.reply(`Ожидание игроков... ${gameState.players.length}/4`);
        }
    } catch (error) {
        console.error('Ошибка в команде /join:', error);
        await ctx.reply('Произошла ошибка при присоединении к игре');
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
        
        // Отправляем общее состояние игры в чат
        await ctx.reply(getPublicGameState(updatedState));
        
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
        const chatId = ctx.chat?.id;
        const userId = ctx.from?.id;
        
        if (!chatId || !userId) return;

        const game = games.get(chatId);
        if (!game) {
            await ctx.reply('Игра не найдена. Начните новую игру с помощью /startbelka');
            return;
        }

        const gameState = game.getGameState();
        const player = gameState.players.find(p => p.id === userId);
        
        if (!player) {
            await ctx.reply('Вы не являетесь участником игры');
            return;
        }

        // Формируем сообщение с картами игрока
        const cardsMessage = formatPlayerCards(player, gameState);
        
        // Отправляем сообщение с кнопками
        const buttons = createCardButtons(player, gameState);
        await ctx.reply(`Карты игрока ${player.username}:`, buttons);
        
    } catch (error) {
        console.error('Ошибка в команде /cards:', error);
        await ctx.reply('Произошла ошибка при отображении карт');
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
        const cardsMessage = formatPlayerCards(player, gameState);
        
        // Показываем карты в виде всплывающего уведомления
        await ctx.answerCbQuery(cardsMessage, { show_alert: true });
        
        // Отправляем кнопки для хода
        const buttons = createCardButtons(player, gameState);
        await ctx.editMessageText(`Карты игрока ${player.username}:`, buttons);
        
    } catch (error) {
        console.error('Ошибка при показе карт:', error);
        await ctx.answerCbQuery('Произошла ошибка при отображении карт');
    }
});

// Обработчик нажатия на кнопку карты
bot.action(/card_(\d+)_(\d+)/, async (ctx) => {
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
        
        // Проверяем, чей сейчас ход
        const currentPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
        
        if (playerId !== currentPlayerId) {
            await ctx.answerCbQuery(`Сейчас ход игрока ${gameState.players[gameState.currentPlayerIndex]?.username}`);
            return;
        }

        // Делаем ход
        const result = game.makeMove(playerId, cardIndex);
        
        if (!result.success) {
            await ctx.answerCbQuery(result.message || 'Не удалось сделать ход');
            return;
        }

        // Отвечаем на callback query
        await ctx.answerCbQuery('Ход сделан!');
        
        // Если раунд завершен, отправляем сводку
        if (result.isRoundComplete && result.roundSummary) {
            await ctx.reply(result.roundSummary);
            
            // Если раунд игры завершен (все карты сыграны), отправляем результаты раунда
            if (result.isGameRoundComplete && result.roundResults) {
                await ctx.reply(result.roundResults);
            }
        }

        // Получаем обновленное состояние игры
        const updatedState = game.getGameState();
        
        // Отправляем обновленное состояние игры в чат
        await ctx.reply(getPublicGameState(updatedState));
        
        // Сообщаем текущему игроку, что его ход
        const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
        if (currentPlayer) {
            await ctx.reply(`@${currentPlayer.username}, ваш ход! Используйте /cards, чтобы увидеть свои карты.`);
        }
        
    } catch (error) {
        console.error('Ошибка при обработке нажатия на кнопку:', error);
        await ctx.answerCbQuery('Произошла ошибка при выполнении хода');
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
        await ctx.reply(getPublicGameState(gameState));
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
                    await ctx.reply(getPublicGameState(updatedState));
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
    
    // Показываем информацию о держателе валета крести только после первого раунда
    if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
        message += ` (ваш козырь)`;
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
                return Markup.button.callback(`${suit}${card.rank}`, `card_${player.id}_${index}`);
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
            } else if (state.playerSuitMap && state.playerSuitMap.has(player.id)) {
                message += ` (${state.playerSuitMap.get(player.id)})`;
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
            } else if (state.playerSuitMap && state.playerSuitMap.has(player.id)) {
                message += ` (${state.playerSuitMap.get(player.id)})`;
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

// Запускаем бота
bot.launch().then(() => {
    console.log('Бот запущен!');
}).catch(err => {
    console.error('Ошибка при запуске бота:', err);
});

// Обработка остановки бота
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));