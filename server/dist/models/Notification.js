"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    recipient: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['announcement', 'bounty', 'system', 'payment'],
        default: 'system',
    },
    read: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
const Notification = mongoose_1.default.model('Notification', notificationSchema);
exports.default = Notification;
