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
Object.defineProperty(exports, "__esModule", { value: true });
var pg_1 = require("pg");
var dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
// Create database connection pool
var pool = new pg_1.Pool({
    user: process.env['DB_USER'] || 'postgres',
    host: process.env['DB_HOST'] || '127.0.0.1',
    database: process.env['DB_NAME'] || 'belka_game',
    password: process.env['DB_PASSWORD'] || 'postgres',
    port: parseInt(process.env['DB_PORT'] || '5432'),
});
// Test connection
pool.connect()
    .then(function (client) {
    console.log('Connected to PostgreSQL database');
    client.release();
})
    .catch(function (err) {
    console.error('Error connecting to PostgreSQL database:', err);
});
exports.default = pool;
