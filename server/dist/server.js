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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./config/db"));
const error_1 = __importDefault(require("./middlewares/error"));
const AppError_1 = __importDefault(require("./utils/AppError"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const companyRoutes_1 = __importDefault(require("./routes/companyRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const triagerRoutes_1 = __importDefault(require("./routes/triagerRoutes"));
const programRoutes_1 = __importDefault(require("./routes/programRoutes"));
const rateLimit_1 = require("./middlewares/rateLimit");
// Load env vars
dotenv_1.default.config(); // Reload env
// Connect to Database
(0, db_1.default)();
const app = (0, express_1.default)();
// Trust Proxy for Vercel
app.set('trust proxy', 1);
// Set security HTTP headers
app.use((0, helmet_1.default)());
// Cross-Origin Resource Sharing
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
// Body parser, reading data from body into req.body
app.use(express_1.default.json({ limit: '10kb' }));
app.use((0, cookie_parser_1.default)());
// Rate Limiting (Global API) - 100 requests per 15 minutes
const apiLimiter = (0, rateLimit_1.rateLimiter)(100, 15 * 60);
app.use('/api', apiLimiter);
// Health Check Root Route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'BugChase API is running', env: process.env.NODE_ENV });
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/company', companyRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/triager', triagerRoutes_1.default);
app.use('/api/programs', programRoutes_1.default);
// Handle Unhandled Routes
app.all(/(.*)/, (req, res, next) => {
    next(new AppError_1.default(`Can't find ${req.originalUrl} on this server!`, 404));
});
// Global Error Handler
app.use(error_1.default);
const PORT = process.env.PORT || 5000;
// Export app for Vercel Serverless
exports.default = app;
// Only listen if not running in Vercel (Vercel handles binding automatically)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
    // Initialize WebSockets
    Promise.resolve().then(() => __importStar(require('./services/socketService'))).then(({ initSocket }) => {
        initSocket(server);
    });
    // Handle Unhandled Rejections
    process.on('unhandledRejection', (err) => {
        console.log('UNHANDLED REJECTION! 💥');
        console.log(err.name, err.message);
        server.close(() => {
            process.exit(1);
        });
    });
}
