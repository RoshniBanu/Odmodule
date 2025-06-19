const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const db = mongoose.connection.db;
    await db.collection('users').dropIndex('registerNo_1');
    console.log('Successfully dropped registerNo index');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropIndex(); 