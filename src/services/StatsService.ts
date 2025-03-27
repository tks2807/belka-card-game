import { PlayerStats } from '../types/game.types';
import * as fs from 'fs';

interface StatsFileStructure {
    global: { [playerId: string]: PlayerStats };
    chats: { [chatId: string]: { [playerId: string]: PlayerStats } };
}
export class StatsService {
    private statsFile = 'player_stats.json';
    private globalStats: Map<number, PlayerStats>;
    private chatStats: Map<number, Map<number, PlayerStats>>;

    constructor() {
        this.globalStats = new Map();
        this.chatStats = new Map();
        this.loadStats();
    }

    private loadStats(): void {
        try {
            if (fs.existsSync(this.statsFile)) {
                const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf-8'));
                this.globalStats = new Map(
                    Object.entries(data.global).map(([key, value]) => [Number(key), value as PlayerStats])
                );
                this.chatStats = new Map(
                    Object.entries(data.chats).map(([chatId, statsObj]) => {
                        const mapStats = new Map(
                            Object.entries(statsObj as Record<string, PlayerStats>).map(([playerId, value]) => [Number(playerId), value as PlayerStats])
                        );
                        return [Number(chatId), mapStats];
                    })
                );
            }
        } catch (error) {
            console.error('Ошибка при загрузке статистики:', error);
        }
    }

    private saveStats(): void {
        try {
            const globalObj: { [playerId: string]: PlayerStats } = Object.fromEntries(
                Array.from(this.globalStats.entries()).map(([k, v]) => [k.toString(), v])
            );
            const chatsObj: { [chatId: string]: { [playerId: string]: PlayerStats } } = {};
            this.chatStats.forEach((mapStats, chatId) => {
                chatsObj[chatId.toString()] = Object.fromEntries(
                    Array.from(mapStats.entries()).map(([k, v]) => [k.toString(), v])
                );
            });
            const data: StatsFileStructure = { global: globalObj, chats: chatsObj };
            fs.writeFileSync(this.statsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Ошибка при сохранении статистики:', error);
        }
    }

    public updatePlayerStats(
        playerId: number,
        username: string,
        won: boolean,
        score: number,
        tricks: number,
        eggs: boolean,
        golaya: boolean,
        chatId: number
    ): void {
        // Обновляем глобальную статистику
        const global = this.globalStats.get(playerId) || {
            username,
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            totalTricks: 0,
            eggsCount: 0,
            golayaCount: 0
        };
        global.gamesPlayed++;
        if (won) global.gamesWon++;
        global.totalScore += score;
        global.totalTricks += tricks;
        if (eggs) global.eggsCount++;
        if (golaya) global.golayaCount++;
        this.globalStats.set(playerId, global);

        // Обновляем статистику для конкретного чата
        let chatMap = this.chatStats.get(chatId);
        if (!chatMap) {
            chatMap = new Map<number, PlayerStats>();
            this.chatStats.set(chatId, chatMap);
        }
        const chatStat = chatMap.get(playerId) || {
            username,
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            totalTricks: 0,
            eggsCount: 0,
            golayaCount: 0
        };
        chatStat.gamesPlayed++;
        if (won) chatStat.gamesWon++;
        chatStat.totalScore += score;
        chatStat.totalTricks += tricks;
        if (eggs) chatStat.eggsCount++;
        if (golaya) chatStat.golayaCount++;
        chatMap.set(playerId, chatStat);

        this.saveStats();
    }

    public getLeaderboardAll(): [number, PlayerStats][] {
        // Сортировка по количеству побед (например)
        return Array.from(this.globalStats.entries()).sort((a, b) => b[1].gamesWon - a[1].gamesWon);
      }
    
      public getLeaderboardChat(chatId: number): [number, PlayerStats][] {
        const chatMap = this.chatStats.get(chatId);
        if (!chatMap) return [];
        return Array.from(chatMap.entries()).sort((a, b) => b[1].gamesWon - a[1].gamesWon);
      }

    public getPlayerStats(playerId: number): PlayerStats {
        return this.globalStats.get(playerId) || {
            username: '',
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            totalTricks: 0,
            eggsCount: 0,
            golayaCount: 0
        };
    }
} 
