"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatManager = exports.ChatManager = void 0;
const fs = require("fs");
const path = require("path");
/**
 * Сервис для управления чатами и их идентификаторами
 * Автоматически обрабатывает миграции из обычных групп в супергруппы
 */
class ChatManager {
    constructor() {
        this.chatMapping = {};
        // Путь к файлу хранения сопоставлений
        this.filePath = path.join(process.cwd(), 'data', 'chats_cache.json');
        this.loadMappings();
    }
    /**
     * Загружает сопоставления чатов из файла
     */
    loadMappings() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                this.chatMapping = JSON.parse(data);
                console.log(`[ChatManager] Загружены сопоставления чатов: ${Object.keys(this.chatMapping).length}`);
            }
            else {
                console.log(`[ChatManager] Файл сопоставлений не найден: ${this.filePath}`);
                this.saveMappings();
            }
        }
        catch (err) {
            console.error('[ChatManager] Ошибка при загрузке сопоставлений чатов:', err);
            this.chatMapping = {};
            this.saveMappings();
        }
    }
    /**
     * Сохраняет сопоставления чатов в файл
     */
    saveMappings() {
        try {
            const dirPath = path.dirname(this.filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(this.chatMapping, null, 2), 'utf8');
            console.log(`[ChatManager] Сопоставления сохранены в: ${this.filePath}`);
        }
        catch (err) {
            console.error('[ChatManager] Ошибка при сохранении сопоставлений чатов:', err);
        }
    }
    /**
     * Добавляет новое сопоставление старого и нового ID чата
     */
    addMapping(oldChatId, newChatId) {
        this.chatMapping[oldChatId] = newChatId;
        console.log(`[ChatManager] Добавлено сопоставление: ${oldChatId} -> ${newChatId}`);
        this.saveMappings();
    }
    /**
     * Получает актуальный ID чата
     * Если чат был мигрирован в супергруппу, возвращает новый ID
     */
    getActualChatId(chatId) {
        const mappedId = this.chatMapping[chatId];
        if (mappedId) {
            console.log(`[ChatManager] Найдено сопоставление для чата ${chatId} -> ${mappedId}`);
            return mappedId;
        }
        return chatId;
    }
    /**
     * Проверяет, был ли чат мигрирован
     */
    hasMigrated(chatId) {
        return !!this.chatMapping[chatId];
    }
}
exports.ChatManager = ChatManager;
// Экспортируем экземпляр класса для использования в других модулях
exports.chatManager = new ChatManager();
