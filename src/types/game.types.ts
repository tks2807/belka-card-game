export type CardSuit = '♠' | '♣' | '♦' | '♥';
export type CardRank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: CardSuit;
    rank: CardRank;
    value: number;
}

export interface Player {
    id: number;
    username: string;
    cards: Card[];
    score: number;
    tricks: number;
    chatId: number;
}

export interface Team {
    players: Player[];
    score: number;
    tricks: number;
}

export interface TableCard {
    card: Card;
    playerId: number;
}

export interface GameState {
    players: Player[];
    currentPlayerIndex: number;
    tableCards: TableCard[];
    isActive: boolean;
    trump: CardSuit | null;
    currentRound: number;
    teams: {
        team1: {
            players: Player[];
            score: number;
            tricks: number;
            eyes: number;
        };
        team2: {
            players: Player[];
            score: number;
            tricks: number;
            eyes: number;
        };
    };
    clubJackHolder: Player | null;
    initialClubJackHolder: Player | null;
    playerSuitMap: Map<number, CardSuit>;
    hideClubJackHolder: boolean;
}

export interface PlayerStats {
    username: string;
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    totalTricks: number;
    eggsCount: number;
    golayaCount: number;
}

export interface MoveResult {
    success: boolean;
    message?: string;
    isRoundComplete?: boolean;
    isGameRoundComplete?: boolean;
    roundSummary?: string;
    roundResults?: string;
}

export interface CardsBySuit {
    [suit: string]: Card[] | undefined;
}
