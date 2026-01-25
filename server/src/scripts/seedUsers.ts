import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config({ path: '../../.env' }); // Adjust path if needed, usually .env is in server root

const seedUsers = async () => {
    try {
        console.log('Connecting to DB...');
        // We need to load env vars correctly. assuming script runs from server/src/scripts
        // so .env is at server/.env, which is ../../.env from here. 
        // But if we run via ts-node from server root, it might be just .env
        // Safest is to rely on standard dotenv.config() if running from root.
        
        if (!process.env.DATABASE_URL) {
            // fallback for dev
            const MONGO_URI = 'mongodb://127.0.0.1:27017/bugbounty-hub'; // Guessing local URI if not in env
             await mongoose.connect(MONGO_URI);
        } else {
             await mongoose.connect(process.env.DATABASE_URL.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || ''));
        }
       
        console.log('DB Connected.');

        const usersToCreate = [
            {
                name: 'Admin User',
                email: '221370089@gift.edu.pk',
                password: 'shahzaib123',
                role: 'admin',
                username: 'admin_user',
                isVerified: true,
                isEmailVerified: true
            },
            {
                name: 'Triager User',
                email: '221370079@gift.edu.pk',
                password: 'shahzaib123',
                role: 'triager',
                username: 'triager_user',
                isVerified: true,
                isEmailVerified: true,
                expertise: ['Web'] // Required for Triager
            }
        ];

        for (const u of usersToCreate) {
            const existing = await User.findOne({ email: u.email });
            if (existing) {
                console.log(`User ${u.email} already exists. Skipping or Updating.`);
                // Optional: Update password if needed, but skipping for safety
            } else {
                await User.create(u);
                console.log(`User ${u.email} created successfully as ${u.role}.`);
            }
        }

        console.log('Done!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
