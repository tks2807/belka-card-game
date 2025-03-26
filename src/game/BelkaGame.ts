import { Card, Player, CardSuit, CardRank, TableCard } from '../types/game.types';
import { StatsService } from '../services/StatsService';
import { MoveResult } from '../types/game.types';

// Перемещаем интерфейс GameState в отдельный файл types/game.types.ts
// и расширяем его здесь для внутреннего использования
interface ExtendedGameState {
    players: Player[];
    currentPlayerIndex: number;
    deck: Card[];
    tableCards: TableCard[];
    isActive: boolean;
    trump: CardSuit | null;
    currentRound: number;
    trickWinner: Player | null;
    chatId: number;
    endVotes: Set<number>;
    teams: {
        team1: {
            players: Player[];
            score: number;    // Очки в текущей раздаче
            tricks: number;   // Количество взяток
            eyes: number;     // Количество "глаз"
        };
        team2: {
            players: Player[];
            score: number;
            tricks: number;
            eyes: number;
        };
    };
    clubJackHolder: Player | null; // Держатель валета крести
    initialClubJackHolder: Player | null; // Игрок, у которого был валет крести в первой раздаче
    playerSuitMap: Map<number, CardSuit>; // Соответствие игроков и мастей для козырей
    hideClubJackHolder: boolean;
    eggsTiebreaker: boolean;
    gameMode: 'belka' | 'walka'; // Режим игры: "белка" до 12 глаз или "валка" до 6 глаз
}

export class BelkaGame {
    private state: ExtendedGameState;
    private statsService: StatsService;
    
    constructor(chatId: number) {
        this.statsService = new StatsService();
        this.state = {
            players: [],
            currentPlayerIndex: 0,
            deck: [],
            tableCards: [],
            isActive: false,
            trump: null,
            currentRound: 1,
            trickWinner: null,
            chatId: chatId,
            endVotes: new Set(),
            teams: {
                team1: {
                    players: [],
                    score: 0,
                    tricks: 0,
                    eyes: 0
                },
                team2: {
                    players: [],
                    score: 0,
                    tricks: 0,
                    eyes: 0
                }
            },
            clubJackHolder: null,
            initialClubJackHolder: null,
            playerSuitMap: new Map(),
            hideClubJackHolder: true,
            eggsTiebreaker: false,
            gameMode: 'belka' // По умолчанию режим "белка"
        };
    }

    private createDeck(): Card[] {
        const suits: CardSuit[] = ['♠', '♣', '♦', '♥'];
        const ranks: CardRank[] = ['7', '8', '9', 'Q', 'K', '10', 'A', 'J'];
        const values: { [key in CardRank]: number } = {
            '7': 7, '8': 8, '9': 9, 
            'Q': 10, 'K': 11, '10': 12, 
            'A': 13, 'J': 14
        };

        const deck: Card[] = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank, value: values[rank] });
            }
        }
        return this.shuffleDeck(deck);
    }

    private shuffleDeck(deck: Card[]): Card[] {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    private selectTrump(): CardSuit {
        const suits: CardSuit[] = ['♠', '♣', '♦', '♥'];
        return suits[Math.floor(Math.random() * suits.length)];
    }

    private calculateCardValue(card: Card): number {
        // Специальная логика для вальтов (они всегда козыри)
        if (card.rank === 'J') {
            switch (card.suit) {
                case '♣': return 1000; // Валет крести - самый старший
                case '♠': return 900;  // Валет пики - второй по старшинству
                case '♥': return 800;  // Валет черви - третий
                case '♦': return 700;  // Валет буби - младший из вальтов
            }
        }

        // Для остальных карт
        const baseValue = card.value;
        return card.suit === this.state.trump ? baseValue + 100 : baseValue;
    }

    public addPlayer(player: { id: number; username: string; chatId: number }): boolean {
        if (this.state.isActive || this.state.players.length >= 4) {
            return false;
        }

        const newPlayer = {
            ...player,
            cards: [],
            score: 0,
            tricks: 0,
            chatId: this.state.chatId
        };

        this.state.players.push(newPlayer);

        // Распределяем игроков по командам
        if (this.state.players.length === 1 || this.state.players.length === 3) {
            this.state.teams.team1.players.push(newPlayer);
        } else {
            this.state.teams.team2.players.push(newPlayer);
        }

        return true;
    }

    public startGame(mode: 'belka' | 'walka' = 'belka'): string {
        if (this.state.isActive) {
            return "Игра уже запущена!";
        }

        this.state.isActive = true;
        this.state.currentRound = 1;
        this.state.currentPlayerIndex = 0;
        this.state.tableCards = [];
        this.state.eggsTiebreaker = false;
        this.state.hideClubJackHolder = true;
        this.state.playerSuitMap.clear();
        this.state.initialClubJackHolder = null;
        this.state.clubJackHolder = null;
        this.state.gameMode = mode;

        console.log(`[LOG] Запуск игры в режиме: ${mode}`);

        // Создаем и перемешиваем колоду
        this.state.deck = this.createDeck();
        this.shuffleDeck(this.state.deck);

        // Раздаем карты игрокам
        this.dealCards();
        
        // Проверяем, нужна ли пересдача
        let needReshuffle = false;
        for (const player of this.state.players) {
            if (this.checkForReshuffle(player.id)) {
                needReshuffle = true;
                console.log(`[LOG] Требуется пересдача для игрока ${player.username}`);
                break;
            }
        }
        
        if (needReshuffle) {
            console.log(`[LOG] Выполняем пересдачу карт`);
            // Пересдаем карты
            this.state.deck = this.createDeck();
            this.shuffleDeck(this.state.deck);
            this.dealCards();
        }
        
        // Находим игрока с валетом крести и устанавливаем его как initialClubJackHolder
        for (const player of this.state.players) {
            if (player.cards.some(card => card.rank === 'J' && card.suit === '♣')) {
                console.log(`[LOG] Валет крести у игрока ${player.username}`);
                this.state.clubJackHolder = player;
                this.state.initialClubJackHolder = player;
                break;
            }
        }
        
        // Устанавливаем соответствие мастей для каждого игрока
        this.setupPlayerSuitMap();
        
        // Определяем козырь для первого раунда (всегда крести)
        this.state.trump = '♣';
        
        console.log(`[LOG] Инициализация игры завершена. Козырь: ${this.state.trump}, держатель валета крести: ${this.state.clubJackHolder?.username || 'не найден'}`);

        // Возвращаем информацию о начальном состоянии игры
        return this.getGameSummary();
    }

    private dealCards(): void {
        const cardsPerPlayer = 8;
        for (const player of this.state.players) {
            player.cards = this.state.deck.splice(0, cardsPerPlayer);
            player.cards.sort((a, b) => {
                if (a.suit === b.suit) {
                    return a.value - b.value;
                }
                return a.suit.localeCompare(b.suit);
            });
        }
    }

    public makeMove(playerId: number, cardIndex: number): MoveResult {
        const playerIndex = this.state.players.findIndex(p => p.id === playerId);
        
        if (playerIndex === -1) {
            return { success: false, message: 'Игрок не найден' };
        }
        
        const player = this.state.players[playerIndex];

        if (!this.state.isActive) {
            return { success: false, message: 'Игра еще не началась или уже закончена' };
        }

        if (playerIndex !== this.state.currentPlayerIndex) {
            return { 
                success: false, 
                message: `Сейчас не ваш ход! Ход игрока: ${this.state.players[this.state.currentPlayerIndex].username}` 
            };
        }

        if (cardIndex < 0 || cardIndex >= player.cards.length) {
            return { success: false, message: 'Некорректный номер карты' };
        }

        const card = player.cards[cardIndex];

        // Проверка хода в масть
        if (this.state.tableCards.length > 0) {
            const firstCard = this.state.tableCards[0].card;
            const firstCardSuit = firstCard.suit;
            const isFirstCardTrump = firstCardSuit === this.state.trump || firstCard.rank === 'J';
            
            if (isFirstCardTrump) {
                // Если первая карта козырная или валет
                
                // Проверяем, есть ли у игрока козыри (включая вальтов)
                const hasTrump = player.cards.some(c => 
                    c.suit === this.state.trump || c.rank === 'J'
                );
                
                // Проверяем, является ли текущая карта козырем или валетом
                const isCardTrump = card.suit === this.state.trump || card.rank === 'J';
                
                if (hasTrump && !isCardTrump) {
                    // Если у игрока есть козыри (включая вальтов), но он пытается ходить не козырем
                    return { 
                        success: false, 
                        message: `Нужно ходить козырем (включая вальтов), так как первая карта козырная` 
                    };
                }
            } else {
                // Если первая карта не козырная и не валет
                
                // Проверяем, есть ли у игрока карты масти первой карты
                const hasSuit = player.cards.some(c => c.suit === firstCardSuit && c.rank !== 'J');
                
                if (hasSuit) {
                    // Если у игрока есть карты масти первой карты
                    if (card.suit !== firstCardSuit || card.rank === 'J') {
                        // Если игрок пытается ходить другой мастью или валетом
                        return { 
                            success: false, 
                            message: `Нужно ходить в масть ${firstCardSuit}, валеты нельзя использовать, если у вас есть карты нужной масти` 
                        };
                    }
                }
                // Если у игрока нет карт масти первой карты, он может ходить любой картой (включая валетов)
            }
        }

        // Удаляем карту из руки игрока
        player.cards.splice(cardIndex, 1);
        
        // Добавляем карту на стол с информацией о том, кто её положил
        this.state.tableCards.push({ card, playerId });

        // Если все игроки сделали ходы, разрешаем раунд
        if (this.state.tableCards.length === this.state.players.length) {
            // Создаем сводку раунда перед разрешением
            const roundSummary = this.createRoundSummary();
            
            // Разрешаем раунд и определяем победителя
            this.resolveRound();

            // Проверяем, закончились ли карты у всех игроков
            const allCardsPlayed = this.state.players.every(player => player.cards.length === 0);
            
            console.log(`[LOG] Проверка окончания карт у всех игроков: ${allCardsPlayed}`);
            
            if (allCardsPlayed) {
                // Если все карты сыграны, подводим итоги раунда
                console.log(`[LOG] Все карты сыграны, формируем результаты раунда`);
                const roundResults = this.finishRound();
                console.log(`[LOG] Результаты раунда сформированы, длина: ${roundResults.length}`);
                
                return { 
                    success: true, 
                    isRoundComplete: true,
                    isGameRoundComplete: true,
                    roundSummary,
                    roundResults
                };
            }

            return { 
                success: true, 
                isRoundComplete: true,
                roundSummary
            };
        } else {
            // Передаем ход следующему игроку
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
            return { 
                success: true,
                message: `Ход передан игроку ${this.state.players[this.state.currentPlayerIndex].username}`
            };
        }
    }

    private resolveRound(): void {
        if (this.state.tableCards.length !== 4) {
            throw new Error("Невозможно завершить раунд: на столе не 4 карты");
        }

        // Определяем победителя, используя вспомогательный метод
        // Так как мы уже проверили, что на столе 4 карты, метод determineRoundWinner() вернет правильного победителя
        const winningPlayerId = this.determineRoundWinner();
        const winningPlayer = this.state.players.find(p => p.id === winningPlayerId);
        
        if (!winningPlayer) {
            throw new Error("Не удалось найти победителя раунда");
        }
        
        // Определяем команду победителя
        const winningTeam = this.state.teams.team1.players.some(p => p.id === winningPlayerId) ? 1 : 2;
        
        // Начисляем очки команде победителя
        let roundScore = 0;
        for (const tableCard of this.state.tableCards) {
            roundScore += this.getCardPoints(tableCard.card);
        }
        
        if (winningTeam === 1) {
            this.state.teams.team1.score += roundScore;
            this.state.teams.team1.tricks += 1;
        } else {
            this.state.teams.team2.score += roundScore;
            this.state.teams.team2.tricks += 1;
        }
        
        // Устанавливаем следующего игрока (победитель ходит первым)
        this.state.currentPlayerIndex = this.state.players.findIndex(p => p.id === winningPlayerId);
        
        // Очищаем стол
        this.state.tableCards = [];
    }

    // Вспомогательный метод для определения значения валета по масти
    private getJackValue(suit: CardSuit): number {
        const jackHierarchy: { [key in CardSuit]?: number } = {
            '♣': 4, // крести (высший)
            '♠': 3, // пики
            '♥': 2, // черви
            '♦': 1  // буби (низший)
        };
        
        return jackHierarchy[suit] || 0;
    }

    // Вспомогательный метод для определения значения карты
    private getCardValue(card: Card): number {
        const valueMap: { [key: string]: number } = {
            '7': 1,
            '8': 2,
            '9': 3,
            'Q': 4,
            'K': 5,
            '10': 6,
            'A': 7,
            'J': 8 // Валеты имеют наивысшее значение
        };
        
        return valueMap[card.rank] || 0;
    }

    private createRoundSummary(): string {
        let summary = '🃏 Карты на столе:\n';
        
        // Показываем все карты на столе
        this.state.tableCards.forEach(tableCard => {
            if (!tableCard) return; // Пропускаем, если карта не определена
            
            const player = this.state.players.find(p => p.id === tableCard.playerId);
            if (!player) return; // Пропускаем, если игрок не найден
            
            summary += `${player.username}: ${tableCard.card.suit}${tableCard.card.rank}\n`;
        });
        
        // Определяем победителя или следующего игрока
        const nextPlayerId = this.determineRoundWinner();
        const nextPlayer = this.state.players.find(p => p.id === nextPlayerId);
        
        if (nextPlayer) {
            // Если на столе уже все карты, показываем, кто забирает взятку
            if (this.state.tableCards.length === this.state.players.length) {
                summary += `\n🏆 Взятку забирает: ${nextPlayer.username}`;
            }
            // В любом случае показываем, чей следующий ход
            summary += `\n🎯 Следующий ход: @${nextPlayer.username}`;
        }
        
        return summary;
    }

    // Вспомогательный метод для определения победителя раунда
    private determineRoundWinner(): number {
        if (this.state.tableCards.length !== 4) {
            // Если на столе еще не все карты, "победителя" еще нет
            // Возвращаем ID текущего игрока как "следующего"
            return this.state.players[this.state.currentPlayerIndex].id;
        }

        // Определяем первую карту и ее масть
        const firstCard = this.state.tableCards[0].card;
        const leadSuit = firstCard.suit;
        
        // Определяем козырную масть
        const trumpSuit = this.state.trump;
        
        let winningCardIndex = 0;
        let highestValue = this.getCardValue(this.state.tableCards[0].card);
        
        for (let i = 1; i < this.state.tableCards.length; i++) {
            const currentCard = this.state.tableCards[i].card;
            
            // Проверяем, является ли карта валетом (валеты всегда козыри)
            const isCurrentJack = currentCard.rank === 'J';
            const isWinningJack = this.state.tableCards[winningCardIndex].card.rank === 'J';
            
            // Проверяем, является ли карта козырем
            const isCurrentTrump = currentCard.suit === trumpSuit || isCurrentJack;
            const isWinningTrump = this.state.tableCards[winningCardIndex].card.suit === trumpSuit || isWinningJack;
            
            // Если текущая карта - валет, а выигрывающая - нет, или текущая карта - козырь, а выигрывающая - нет
            if ((isCurrentJack && !isWinningJack) || (isCurrentTrump && !isWinningTrump)) {
                winningCardIndex = i;
                highestValue = this.getCardValue(currentCard);
                continue;
            }
            
            // Если обе карты - валеты, сравниваем их по иерархии
            if (isCurrentJack && isWinningJack) {
                const currentJackValue = this.getJackValue(currentCard.suit);
                const winningJackValue = this.getJackValue(this.state.tableCards[winningCardIndex].card.suit);
                
                if (currentJackValue > winningJackValue) {
                    winningCardIndex = i;
                    highestValue = this.getCardValue(currentCard);
                }
                continue;
            }
            
            // Если обе карты - козыри (но не валеты), сравниваем их по значению
            if (isCurrentTrump && isWinningTrump && !isCurrentJack && !isWinningJack) {
                if (this.getCardValue(currentCard) > highestValue) {
                    winningCardIndex = i;
                    highestValue = this.getCardValue(currentCard);
                }
                continue;
            }
            
            // Если ни одна из карт не козырь и не валет, и текущая карта той же масти, что и первая
            if (!isCurrentTrump && !isWinningTrump && currentCard.suit === leadSuit) {
                if (this.getCardValue(currentCard) > highestValue) {
                    winningCardIndex = i;
                    highestValue = this.getCardValue(currentCard);
                }
            }
        }
        
        // Возвращаем ID победителя
        return this.state.tableCards[winningCardIndex].playerId;
    }

    private getJackPriority(suit: CardSuit): number {
        switch (suit) {
            case '♣': return 4; // Крести (самый старший)
            case '♠': return 3; // Пики
            case '♥': return 2; // Черви
            case '♦': return 1; // Буби (самый младший)
            default: return 0;
        }
    }

    private checkRoundWinConditions(): void {
        // Проверка на "голую"
        if (this.state.teams.team1.score === 120 && this.state.teams.team2.tricks === 0) {
            this.endGame(true, 1); // Добавляем второй параметр - номер команды
            return;
        } 
        
        if (this.state.teams.team2.score === 120 && this.state.teams.team1.tricks === 0) {
            this.endGame(true, 2); // Добавляем второй параметр - номер команды
            return;
        }
        
        // Проверка на "яйца" (по 60 очков)
        if (this.state.teams.team1.score === 60 && this.state.teams.team2.score === 60) {
            // Логика для "яиц" - переигрываем раунд
            this.state.eggsTiebreaker = true; // Устанавливаем флаг переигровки
            this.startNewRound(); // Переигрываем раунд
            return;
        }
        
        // Обычный подсчет глаз
        if (this.state.teams.team1.score >= 91) {
            this.state.teams.team1.eyes += 2;
        } else if (this.state.teams.team1.score >= 61) {
            this.state.teams.team1.eyes += 1;
        }
        
        if (this.state.teams.team2.score >= 91) {
            this.state.teams.team2.eyes += 2;
        } else if (this.state.teams.team2.score >= 61) {
            this.state.teams.team2.eyes += 1;
        }
        
        // Определяем необходимое количество глаз для победы в зависимости от режима игры
        const eyesToWin = this.state.gameMode === 'belka' ? 12 : 6;
        
        // Проверка на победу по глазам
        if (this.state.teams.team1.eyes >= eyesToWin) {
            this.endGame(false, 1); // Добавляем второй параметр - номер команды
            return;
        }
        
        if (this.state.teams.team2.eyes >= eyesToWin) {
            this.endGame(false, 2); // Добавляем второй параметр - номер команды
            return;
        }
        
        // Если никто не выиграл, начинаем новый раунд
        this.startNewRound();
    }

    private calculatePoints(tableCards: TableCard[]): number {
        let points = 0;
        for (const tableCard of tableCards) {
            const card = tableCard.card;
            switch (card.rank) {
                case 'A': points += 11; break;
                case '10': points += 10; break;
                case 'K': points += 4; break;
                case 'Q': points += 3; break;
                case 'J': points += 2; break;
                default: break;
            }
        }
        return points;
    }

    private startNewRound(): void {
        this.state.currentRound++;
        console.log(`[LOG] Начинается раунд ${this.state.currentRound}`);
        
        // Сбрасываем счет и взятки для нового раунда
        this.state.teams.team1.score = 0;
        this.state.teams.team1.tricks = 0;
        this.state.teams.team2.score = 0;
        this.state.teams.team2.tricks = 0;
        
        // Создаем новую колоду и раздаем карты
        this.state.deck = this.createDeck();
        this.dealCards();
        
        // Проверяем, нужна ли пересдача
        let needReshuffle = false;
        for (const player of this.state.players) {
            if (this.checkForReshuffle(player.id)) {
                needReshuffle = true;
                console.log(`[LOG] Требуется пересдача для игрока ${player.username}`);
                break;
            }
        }
        
        if (needReshuffle) {
            console.log(`[LOG] Выполняем пересдачу карт`);
            // Пересдаем карты
            this.state.deck = this.createDeck();
            this.shuffleDeck(this.state.deck);
            this.dealCards();
        }
        
        // Сначала сбрасываем держателя валета крести
        this.state.clubJackHolder = null;
        
        // Находим игрока с валетом крести
        for (const player of this.state.players) {
            if (player.cards.some(card => card.rank === 'J' && card.suit === '♣')) {
                console.log(`[LOG] Валет крести у игрока ${player.username}`);
                this.state.clubJackHolder = player;
                break;
            }
        }
        
        // После первого раунда показываем, чей козырь
        if (this.state.currentRound > 1) {
            this.state.hideClubJackHolder = false;
        }
        
        // Определяем козырь для нового раунда
        this.determineNewTrump();
        
        console.log(`[LOG] Раунд ${this.state.currentRound} инициализирован. Козырь: ${this.state.trump}, держатель валета крести: ${this.state.clubJackHolder?.username || 'не найден'}`);
    }

    private determineNewTrump(): void {
        // Находим игрока с валетом крести
        let clubJackHolder: Player | null = null;
        for (const player of this.state.players) {
            if (player.cards.some(card => card.rank === 'J' && card.suit === '♣')) {
                clubJackHolder = player;
                break;
            }
        }
        
        if (clubJackHolder) {
            // Сохраняем текущего держателя валета крести
            this.state.clubJackHolder = clubJackHolder;
            
            // В первом раунде козырь всегда крести
            if (this.state.currentRound === 1) {
                this.state.trump = '♣';
                return;
            }
            
            // Определяем масть козыря по карте игрока
            if (this.state.playerSuitMap && this.state.playerSuitMap.has(clubJackHolder.id)) {
                this.state.trump = this.state.playerSuitMap.get(clubJackHolder.id)!;
            } else {
                // Если по какой-то причине нет соответствия, устанавливаем крести
                this.state.trump = '♣';
            }
        } else {
            // Если валет крести не найден, выбираем случайный козырь
            this.state.trump = this.selectTrump();
        }
    }

    private finishRound(): string {
        // Определяем, кто выиграл раунд
        const team1Won = this.state.teams.team1.score > this.state.teams.team2.score;
        const team2Won = this.state.teams.team2.score > this.state.teams.team1.score;
        const isTie = this.state.teams.team1.score === this.state.teams.team2.score;
        
        // Инициализируем переменные для глаз
        let team1Eyes = 0;
        let team2Eyes = 0;
        
        // Проверка на "голую" (все взятки + 120 очков)
        if (this.state.teams.team1.score === 120 && this.state.teams.team2.tricks === 0) {
            this.endGame(true, 1);
            return "🏆 Команда 1 выиграла 'голую'! Игра окончена!";
        }
        
        if (this.state.teams.team2.score === 120 && this.state.teams.team1.tricks === 0) {
            this.endGame(true, 2);
            return "🏆 Команда 2 выиграла 'голую'! Игра окончена!";
        }
        
        // Проверка на "яйца" (по 60 очков)
        if (this.state.teams.team1.score === 60 && this.state.teams.team2.score === 60) {
            return "🥚 Яйца! Обе команды набрали по 60 очков. Раунд будет переигран, победившая команда получит 4 очка.";
        }
        
        // Проверка, является ли этот раунд переигровкой после "яиц"
        if (this.state.eggsTiebreaker) {
            if (team1Won) {
                this.state.teams.team1.eyes += 4;
                team1Eyes = 4;
            } else if (team2Won) {
                this.state.teams.team2.eyes += 4;
                team2Eyes = 4;
            }
            // Сбрасываем флаг переигровки
            this.state.eggsTiebreaker = false;
        } else {
            // После 1-го раунда выигравшей команде всегда 2 глаза
            if (this.state.currentRound === 1) {
                if (team1Won) {
                    this.state.teams.team1.eyes += 2;
                    team1Eyes = 2;
                } else if (team2Won) {
                    this.state.teams.team2.eyes += 2;
                    team2Eyes = 2;
                }
            } else {
                // Обычный подсчет глаз для последующих раундов
                if (this.state.teams.team1.score >= 91) {
                    this.state.teams.team1.eyes += 2;
                    team1Eyes = 2;
                } else if (this.state.teams.team1.score >= 61) {
                    this.state.teams.team1.eyes += 1;
                    team1Eyes = 1;
                }
                
                if (this.state.teams.team2.score >= 91) {
                    this.state.teams.team2.eyes += 2;
                    team2Eyes = 2;
                } else if (this.state.teams.team2.score >= 61) {
                    this.state.teams.team2.eyes += 1;
                    team2Eyes = 1;
                }
            }
        }
        
        // Проверяем, у кого валет крести и добавляем дополнительный глаз (только не в первом раунде)
        if (this.state.clubJackHolder && this.state.currentRound > 1) {
            const isClubJackInTeam1 = this.state.teams.team1.players.some(p => p.id === this.state.clubJackHolder!.id);
            
            // Если валет крести у команды 2, а выиграла команда 1
            if (!isClubJackInTeam1 && team1Won) {
                this.state.teams.team1.eyes += 1;
                team1Eyes += 1;
            }
            
            // Если валет крести у команды 1, а выиграла команда 2
            if (isClubJackInTeam1 && team2Won) {
                this.state.teams.team2.eyes += 1;
                team2Eyes += 1;
            }
        }
        
        // Формируем сообщение с результатами раунда
        let results = `📊 Результаты раунда ${this.state.currentRound}:\n\n`;
        
        // Добавляем информацию о победителе раунда
        if (team1Won) {
            results += `🏆 Победитель раунда: Команда 1\n\n`;
        } else if (team2Won) {
            results += `🏆 Победитель раунда: Команда 2\n\n`;
        } else if (isTie) {
            results += `🥚 Ничья (Яйца)! Обе команды набрали по ${this.state.teams.team1.score} очков.\n\n`;
        }
        
        results += `👥 Команда 1:\n`;
        // Список игроков команды 1
        this.state.teams.team1.players.forEach(player => {
            let playerName = player.username;
            
            // Показываем значок козыря для держателя валета крести
            if (this.state.clubJackHolder && !this.state.hideClubJackHolder && player.id === this.state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            // Добавляем информацию о мастях игроков только после первого раунда
            if (this.state.currentRound > 1) {
                if (this.state.initialClubJackHolder && player.id === this.state.initialClubJackHolder.id) {
                    playerName += ` (♣)`;
                } else if (this.state.playerSuitMap.has(player.id)) {
                    playerName += ` (${this.state.playerSuitMap.get(player.id)})`;
                }
            }
            
            results += `- ${playerName}\n`;
        });
        
        results += `💯 Очки в раунде: ${this.state.teams.team1.score}\n`;
        results += `👑 Взятки: ${this.state.teams.team1.tricks}\n`;
        
        // Добавляем информацию о глазах
        if (this.state.currentRound === 1 && team1Won) {
            results += `👁️ Глаза в этом раунде: +${team1Eyes} (первый раунд)\n`;
        } else if (this.state.eggsTiebreaker && team1Won) {
            results += `👁️ Глаза в этом раунде: +${team1Eyes} (переигровка после "яиц")\n`;
        } else if (this.state.currentRound > 1 && this.state.clubJackHolder && 
            !this.state.teams.team1.players.some(p => p.id === this.state.clubJackHolder!.id) && 
            team1Won) {
            results += `👁️ Глаза в этом раунде: +${team1Eyes} (включая +1 за валета крести у соперников)\n`;
        } else {
            results += `👁️ Глаза в этом раунде: +${team1Eyes}\n`;
        }
        
        results += `👁️ Всего глаз: ${this.state.teams.team1.eyes}\n\n`;
        
        results += `👥 Команда 2:\n`;
        // Список игроков команды 2
        this.state.teams.team2.players.forEach(player => {
            let playerName = player.username;
            
            // Показываем значок козыря для держателя валета крести
            if (this.state.clubJackHolder && !this.state.hideClubJackHolder && player.id === this.state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            // Добавляем информацию о мастях игроков только после первого раунда
            if (this.state.currentRound > 1) {
                if (this.state.initialClubJackHolder && player.id === this.state.initialClubJackHolder.id) {
                    playerName += ` (♣)`;
                } else if (this.state.playerSuitMap.has(player.id)) {
                    playerName += ` (${this.state.playerSuitMap.get(player.id)})`;
                }
            }
            
            results += `- ${playerName}\n`;
        });
        
        results += `💯 Очки в раунде: ${this.state.teams.team2.score}\n`;
        results += `👑 Взятки: ${this.state.teams.team2.tricks}\n`;
        
        // Добавляем информацию о глазах
        if (this.state.currentRound === 1 && team2Won) {
            results += `👁️ Глаза в этом раунде: +${team2Eyes} (первый раунд)\n`;
        } else if (this.state.eggsTiebreaker && team2Won) {
            results += `👁️ Глаза в этом раунде: +${team2Eyes} (переигровка после "яиц")\n`;
        } else if (this.state.currentRound > 1 && this.state.clubJackHolder && 
            this.state.teams.team1.players.some(p => p.id === this.state.clubJackHolder!.id) && 
            team2Won) {
            results += `👁️ Глаза в этом раунде: +${team2Eyes} (включая +1 за валета крести у соперников)\n`;
        } else {
            results += `👁️ Глаза в этом раунде: +${team2Eyes}\n`;
        }
        
        results += `👁️ Всего глаз: ${this.state.teams.team2.eyes}\n`;
        
        // Определяем необходимое количество глаз для победы в зависимости от режима игры
        const eyesToWin = this.state.gameMode === 'belka' ? 12 : 6;
        
        // Проверка на победу по глазам
        if (this.state.teams.team1.eyes >= eyesToWin) {
            this.endGame(false, 1);
            results += `\n🏆🏆🏆 Команда 1 набрала ${this.state.teams.team1.eyes} глаз (требуется ${eyesToWin})! Игра окончена!`;
        } else if (this.state.teams.team2.eyes >= eyesToWin) {
            this.endGame(false, 2);
            results += `\n🏆🏆🏆 Команда 2 набрала ${this.state.teams.team2.eyes} глаз (требуется ${eyesToWin})! Игра окончена!`;
        } else {
            // Если никто не выиграл, начинаем новый раунд
            this.startNewRound();
            results += `\n🃏 Начинается раунд ${this.state.currentRound}!\n\n`;
            
            // Добавляем информацию о новом раунде из getGameSummary()
            const newRoundSummary = this.getGameSummary();
            results += newRoundSummary;
        }
        
        return results;
    }

    private endGame(isGolden: boolean, winningTeam: 1 | 2): void {
        this.state.isActive = false;
        
        // Обновляем статистику для всех игроков
        const winners = winningTeam === 1 ? this.state.teams.team1.players : this.state.teams.team2.players;
        const losers = winningTeam === 1 ? this.state.teams.team2.players : this.state.teams.team1.players;
        
        winners.forEach(player => {
            this.statsService.updatePlayerStats(
                player.id,
                true,
                winningTeam === 1 ? this.state.teams.team1.score : this.state.teams.team2.score,
                winningTeam === 1 ? this.state.teams.team1.tricks : this.state.teams.team2.tricks
            );
        });
        
        losers.forEach(player => {
            this.statsService.updatePlayerStats(
                player.id,
                false,
                winningTeam === 1 ? this.state.teams.team2.score : this.state.teams.team1.score,
                winningTeam === 1 ? this.state.teams.team2.tricks : this.state.teams.team1.tricks
            );
        });

        if (isGolden) {
            this.state.clubJackHolder = winners[0];
        }
    }

    public getGameState(): Omit<ExtendedGameState, 'endVotes'> {
        // Возвращаем состояние игры без внутренних полей
        const { endVotes, ...gameState } = this.state;
        return gameState;
    }

    public getGameSummary(): string {
        // Определяем необходимое количество глаз для победы в зависимости от режима игры
        const eyesToWin = this.state.gameMode === 'belka' ? 12 : 6;
        const gameModeName = this.state.gameMode === 'belka' ? 'Белка' : 'Валка';

        let summary = `🎮 Режим игры: ${gameModeName} (до ${eyesToWin} глаз)\n`;
        summary += `🃏 Раунд ${this.state.currentRound}\n`;
        summary += `♠️♣️♦️♥️ Козырь: ${this.state.trump}`;
        
        // Показываем информацию о держателе валета крести только после первого раунда
        if (this.state.clubJackHolder && !this.state.hideClubJackHolder) {
            summary += ` (определен игроком ${this.state.clubJackHolder.username})`;
        }
        
        summary += `\n\n`;

        // Информация о командах
        summary += '👥 Команда 1:\n';
        this.state.teams.team1.players.forEach(player => {
            let playerName = player.username;
            
            // Показываем значок козыря для держателя валета крести
            if (this.state.clubJackHolder && !this.state.hideClubJackHolder && player.id === this.state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            // Добавляем информацию о мастях игроков только после первого раунда
            if (this.state.currentRound > 1) {
                if (this.state.initialClubJackHolder && player.id === this.state.initialClubJackHolder.id) {
                    playerName += ` (♣)`;
                } else if (this.state.playerSuitMap.has(player.id)) {
                    playerName += ` (${this.state.playerSuitMap.get(player.id)})`;
                }
            }
            
            summary += `- ${playerName}\n`;
        });
        
        // Добавляем отступ между списком игроков и информацией о глазах
        summary += `\n👁️ Глаза: ${this.state.teams.team1.eyes}/${eyesToWin}\n\n`;

        summary += '👥 Команда 2:\n';
        this.state.teams.team2.players.forEach(player => {
            let playerName = player.username;
            
            // Показываем значок козыря для держателя валета крести
            if (this.state.clubJackHolder && !this.state.hideClubJackHolder && player.id === this.state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            
            // Добавляем информацию о мастях игроков только после первого раунда
            if (this.state.currentRound > 1) {
                if (this.state.initialClubJackHolder && player.id === this.state.initialClubJackHolder.id) {
                    playerName += ` (♣)`;
                } else if (this.state.playerSuitMap.has(player.id)) {
                    playerName += ` (${this.state.playerSuitMap.get(player.id)})`;
                }
            }
            
            summary += `- ${playerName}\n`;
        });
        
        // Добавляем отступ между списком игроков и информацией о глазах
        summary += `\n👁️ Глаза: ${this.state.teams.team2.eyes}/${eyesToWin}\n`;
        
        // Добавляем информацию о том, чей первый ход
        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (currentPlayer) {
            summary += `\n🎯 Первый ход: @${currentPlayer.username}`;
        }

        return summary;
    }

    public initializeEndVoting(initiatorId: number): void {
        this.state.endVotes.clear(); // Очищаем предыдущие голоса
        this.state.endVotes.add(initiatorId);
    }

    public voteForEnd(playerId: number): {
        status: 'not_player' | 'already_voted' | 'voted';
        votesCount?: number;
        requiredVotes?: number;
        gameEnded?: boolean;
    } {
        // Проверяем, активна ли игра
        if (!this.state.isActive) {
            return { status: 'not_player' };
        }

        // Проверяем, является ли голосующий игроком
        if (!this.state.players.some(p => p.id === playerId)) {
            return { status: 'not_player' };
        }

        // Проверяем, не голосовал ли уже
        if (this.state.endVotes.has(playerId)) {
            return { status: 'already_voted' };
        }

        // Добавляем голос
        this.state.endVotes.add(playerId);

        const votesCount = this.state.endVotes.size;
        const requiredVotes = Math.ceil(this.state.players.length / 2);
        const gameEnded = votesCount >= requiredVotes;

        if (gameEnded) {
            // Определяем победителя по текущему счету
            const winningTeam = this.state.teams.team1.eyes > this.state.teams.team2.eyes ? 1 : 2;
            this.endGame(false, winningTeam); // Добавляем второй параметр - номер команды
        }

        return {
            status: 'voted',
            votesCount,
            requiredVotes,
            gameEnded
        };
    }

    public checkForReshuffle(playerId: number): boolean {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return false;

        // Подсчет очков в руке
        const pointsInHand = player.cards.reduce((sum, card) => {
            return sum + this.getCardPoints(card);
        }, 0);

        // Подсчет карт одной масти (без учета валетов)
        const suitCounts = player.cards.reduce((counts: { [key in CardSuit]: number }, card) => {
            if (card.rank !== 'J') {
                counts[card.suit] = (counts[card.suit] || 0) + 1;
            }
            return counts;
        }, {} as { [key in CardSuit]: number });

        // Проверка условий пересдачи
        return pointsInHand <= 13 || Object.values(suitCounts).some(count => count >= 5);
    }

    private getCardPoints(card: Card): number {
        switch (card.rank) {
            case 'A': return 11;
            case '10': return 10;
            case 'K': return 4;
            case 'Q': return 3;
            case 'J': return 2;
            default: return 0;
        }
    }

    private setupPlayerSuitMap(): void {
        if (!this.state.initialClubJackHolder) return;
        
        // Определяем индекс игрока с валетом крести
        const initialHolderIndex = this.state.players.findIndex(
            p => p.id === this.state.initialClubJackHolder!.id
        );
        
        if (initialHolderIndex === -1) return;
        
        // Устанавливаем масти для каждого игрока
        // Порядок мастей: ♣ (крести), ♥ (черви), ♠ (пики), ♦ (буби)
        const suits: CardSuit[] = ['♣', '♥', '♠', '♦'];
        
        // Очищаем предыдущую карту мастей
        this.state.playerSuitMap.clear();
        
        // Игрок с валетом крести всегда отвечает за крести
        for (let i = 0; i < this.state.players.length; i++) {
            const player = this.state.players[i];
            // Вычисляем смещение от игрока с валетом крести
            const suitIndex = (i - initialHolderIndex + 4) % 4;
            // Присваиваем масть каждому игроку
            this.state.playerSuitMap.set(player.id, suits[suitIndex]);
        }
        
        // Выводим отладочную информацию
        console.log(`[LOG] Установлено соответствие игроков и мастей:`);
        this.state.players.forEach(player => {
            console.log(`[LOG] ${player.username}: ${this.state.playerSuitMap.get(player.id)}`);
        });
    }

    public setGameMode(mode: 'belka' | 'walka'): void {
        this.state.gameMode = mode;
        console.log(`[LOG] Установлен режим игры: ${mode}`);
    }
} 