"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signRefreshToken = exports.verifyTwoFactorLoginPendingToken = exports.signTwoFactorLoginPendingToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const TWO_FA_LOGIN_AUD = '2fa_login_pending';
const signToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};
exports.signToken = signToken;
/** Short-lived token after password OK, before TOTP (second login step). */
const signTwoFactorLoginPendingToken = (userId) => {
    return jsonwebtoken_1.default.sign({ id: userId, aud: TWO_FA_LOGIN_AUD }, process.env.JWT_SECRET, {
        expiresIn: '10m',
    });
};
exports.signTwoFactorLoginPendingToken = signTwoFactorLoginPendingToken;
const verifyTwoFactorLoginPendingToken = (token) => {
    const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    if (payload.aud !== TWO_FA_LOGIN_AUD || !payload.id) {
        throw new Error('Invalid 2FA session');
    }
    return { id: String(payload.id) };
};
exports.verifyTwoFactorLoginPendingToken = verifyTwoFactorLoginPendingToken;
const signRefreshToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });
};
exports.signRefreshToken = signRefreshToken;
