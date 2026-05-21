import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: 'dbnh30iql',
  api_key: '741874419883385',
  api_secret: 'lecGb1UdWtbJDXggoTzrpnXSjxg'
});

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  /** Hide raw URL behind signed delivery (recommended for KYC images) */
  type?: 'upload' | 'authenticated' | 'private';
  /** Cloudinary tags for easy filtering in the dashboard */
  tags?: string[];
  /** Overwrite an existing public_id */
  overwrite?: boolean;
  /** Force a specific resource type */
  resourceType?: 'auto' | 'image' | 'video' | 'raw';
}

export const uploadToCloudinary = (
  file: Express.Multer.File,
  options: CloudinaryUploadOptions = {},
): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    let resourceType: 'auto' | 'image' | 'video' | 'raw' = options.resourceType ?? 'auto';
    if (
      !options.resourceType &&
      (file.mimetype === 'application/pdf' ||
        file.mimetype.includes('zip') ||
        file.originalname.endsWith('.pdf'))
    ) {
      resourceType = 'raw';
    }

    const uploadOptions: Record<string, unknown> = {
      folder: options.folder ?? 'BugChase',
      resource_type: resourceType,
    };

    if (options.publicId) uploadOptions.public_id = options.publicId;
    if (options.type) uploadOptions.type = options.type;
    if (options.tags) uploadOptions.tags = options.tags;
    if (options.overwrite !== undefined) uploadOptions.overwrite = options.overwrite;

    if (resourceType === 'raw') {
      const ext = file.originalname.split('.').pop();
      if (ext) uploadOptions.format = ext;
    }

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (result) {
        resolve({ url: result.secure_url, public_id: result.public_id });
      } else {
        reject(error);
      }
    });
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

/** Best-effort delete that swallows "not found" so callers can use it for cleanup. */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (err) {
    console.warn(`[cloudinary] failed to delete ${publicId}:`, (err as Error).message);
  }
};

export default cloudinary;
