const bcrypt = require('bcrypt');
const fs = require('fs');

const run = async () => {
    const passwordHash = await bcrypt.hash('shahzaib123', 12);
    
    const users = [
        {
            "_id": { "$oid": "65f000000000000000000001" },
            "name": "Admin User",
            "username": "admin_user",
            "email": "221370089@gift.edu.pk",
            "password": passwordHash,
            "role": "admin",
            "isVerified": true,
            "isEmailVerified": true,
            "status": "Active",
            "walletBalance": 0,
            "escrowBalance": 0,
            "trustScore": 100,
            "reputationScore": 0,
            "avatar": "default.jpg",
            "createdAt": { "$date": new Date().toISOString() },
            "updatedAt": { "$date": new Date().toISOString() }
        },
        {
            "_id": { "$oid": "65f000000000000000000002" },
            "name": "Triager User",
            "username": "triager_user",
            "email": "221370079@gift.edu.pk",
            "password": passwordHash,
            "role": "triager",
            "isVerified": true,
            "isEmailVerified": true,
            "status": "Active",
            "expertise": ["Web"],
            "walletBalance": 0,
            "escrowBalance": 0,
            "trustScore": 80,
            "reputationScore": 0,
            "avatar": "default.jpg",
            "createdAt": { "$date": new Date().toISOString() },
            "updatedAt": { "$date": new Date().toISOString() }
        }
    ];

    fs.writeFileSync('user_dump.json', JSON.stringify(users, null, 2));
    console.log('JSON written to user_dump.json');
};

run();
