
import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 5000;

// Start server first, then try to connect to DB
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log('🔄 Attempting to connect to MongoDB...');
  
  connectDB()
    .then(() => {
      console.log('✅ MongoDB Connected Successfully');
    })
    .catch((err) => {
      console.error('❌ Failed to connect to MongoDB:', err.message);
      console.log('⚠️  Server is running but database is not connected');
    });
});
