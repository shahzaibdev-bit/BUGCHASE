import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: 'dbnh30iql',
  api_key: '741874419883385',
  api_secret: 'lecGb1UdWtbJDXggoTzrpnXSjxg'
});

export const uploadToCloudinary = (file: Express.Multer.File): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';
    if (file.mimetype === 'application/pdf' || file.mimetype.includes('zip') || file.originalname.endsWith('.pdf')) {
        resourceType = 'raw';
    }

    let uploadOptions: any = { 
        folder: 'BugChase', 
        resource_type: resourceType 
    };

    if (resourceType === 'raw') {
        const ext = file.originalname.split('.').pop();
        if (ext) {
            uploadOptions.format = ext;
        }
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (result) {
          resolve({ url: result.secure_url, public_id: result.public_id });
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

export default cloudinary;
