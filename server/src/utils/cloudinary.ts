import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: 'dbnh30iql',
  api_key: '741874419883385',
  api_secret: 'lecGb1UdWtbJDXggoTzrpnXSjxg'
});

export const uploadToCloudinary = (buffer: Buffer): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'BugChase' },
      (error, result) => {
        if (result) {
          resolve({ url: result.secure_url, public_id: result.public_id });
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export default cloudinary;
