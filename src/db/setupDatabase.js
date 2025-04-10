"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var index_1 = __importDefault(require("./index"));
function setupDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var client, schemaFile, schema, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    console.log('Attempting to connect to PostgreSQL...');
                    return [4 /*yield*/, index_1.default.connect()];
                case 1:
                    client = _a.sent();
                    console.log('Connected! Setting up database schema...');
                    schemaFile = path.join(__dirname, 'schema.sql');
                    console.log("Reading schema from ".concat(schemaFile));
                    schema = fs.readFileSync(schemaFile, 'utf8');
                    // Execute schema
                    console.log('Executing schema SQL...');
                    return [4 /*yield*/, client.query(schema)];
                case 2:
                    _a.sent();
                    console.log('Database schema setup completed!');
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error setting up database schema:', error_1);
                    // Проверка типичных проблем
                    if (error_1.code === 'ECONNREFUSED') {
                        console.error('\nПОДСКАЗКА: Не удалось подключиться к базе данных PostgreSQL.');
                        console.error('Пожалуйста, убедитесь что:');
                        console.error('1. PostgreSQL установлен и запущен');
                        console.error('2. Параметры подключения в файле .env корректны');
                        console.error('3. База данных "belka_game" создана:');
                        console.error('   - Откройте pgAdmin');
                        console.error('   - Щелкните правой кнопкой на "Databases"');
                        console.error('   - Выберите "Create" > "Database"');
                        console.error('   - Введите "belka_game" и нажмите "Save"');
                    }
                    else if (error_1.code === '3D000') {
                        console.error('\nПОДСКАЗКА: База данных "belka_game" не существует.');
                        console.error('Необходимо создать базу данных перед запуском этого скрипта.');
                    }
                    else if (error_1.code === '28P01') {
                        console.error('\nПОДСКАЗКА: Неверный пароль для пользователя PostgreSQL.');
                        console.error('Проверьте настройки в файле .env');
                    }
                    throw error_1;
                case 4:
                    if (client)
                        client.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// If this file is run directly (not imported), execute the setup
if (require.main === module) {
    setupDatabase()
        .then(function () {
        console.log('Database setup completed successfully.');
        process.exit(0);
    })
        .catch(function (err) {
        console.error('Database setup failed:', err);
        process.exit(1);
    });
}
exports.default = setupDatabase;
