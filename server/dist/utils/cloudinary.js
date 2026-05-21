"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const streamifier_1 = __importDefault(require("streamifier"));
cloudinary_1.v2.config({
    cloud_name: 'dbnh30iql',
    api_key: '741874419883385',
    api_secret: 'lecGb1UdWtbJDXggoTzrpnXSjxg'
});
const uploadToCloudinary = (file, options = {}) => {
    return new Promise((resolve, reject) => {
        let resourceType = options.resourceType ?? 'auto';
        if (!options.resourceType &&
            (file.mimetype === 'application/pdf' ||
                file.mimetype.includes('zip') ||
                file.originalname.endsWith('.pdf'))) {
            resourceType = 'raw';
        }
        const uploadOptions = {
            folder: options.folder ?? 'BugChase',
            resource_type: resourceType,
        };
        if (options.publicId)
            uploadOptions.public_id = options.publicId;
        if (options.type)
            uploadOptions.type = options.type;
        if (options.tags)
            uploadOptions.tags = options.tags;
        if (options.overwrite !== undefined)
            uploadOptions.overwrite = options.overwrite;
        if (resourceType === 'raw') {
            const ext = file.originalname.split('.').pop();
            if (ext)
                uploadOptions.format = ext;
        }
        const stream = cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
            if (result) {
                resolve({ url: result.secure_url, public_id: result.public_id });
            }
            else {
                reject(error);
            }
        });
        streamifier_1.default.createReadStream(file.buffer).pipe(stream);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
/** Best-effort delete that swallows "not found" so callers can use it for cleanup. */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    }
    catch (err) {
        console.warn(`[cloudinary] failed to delete ${publicId}:`, err.message);
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.default = cloudinary_1.v2;
