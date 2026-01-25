const bcrypt = require('bcrypt');

const hash = async () => {
    const p = 'shahzaib123';
    const h = await bcrypt.hash(p, 12);
    console.log('HASH:', h);
};

hash();
