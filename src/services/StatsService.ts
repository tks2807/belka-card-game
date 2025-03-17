import { PlayerStats } from '../types/game.types';
import * as fs from 'fs';

export class StatsService {
    private statsFile = 'player_stats.json';
    private stats: Map<number, PlayerStats>;

    constructor() {
        this.stats = new Map();
        this.loadStats();
    }

    private loadStats(): void {
        try {
            if (fs.existsSync(this.statsFile)) {
                const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf-8'));
                this.stats = new Map(Object.entries(data).map(([key, value]) => [Number(key), value as PlayerStats]));
            }
        } catch (error) {
            console.error('Ошибка при загрузке статистики:', error);
        }
    }

    private saveStats(): void {
        try {
            const data = Object.fromEntries(this.stats);
            fs.writeFileSync(this.statsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Ошибка при сохранении статистики:', error);
        }
    }

    public updatePlayerStats(playerId: number, won: boolean, score: number, tricks: number): void {
        const stats = this.stats.get(playerId) || {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            totalTricks: 0
        };

        stats.gamesPlayed++;
        if (won) stats.gamesWon++;
        stats.totalScore += score;
        stats.totalTricks += tricks;

        this.stats.set(playerId, stats);
        this.saveStats();
    }

    public getPlayerStats(playerId: number): PlayerStats {
        return this.stats.get(playerId) || {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            totalTricks: 0
        };
    }
} 