// config/db.js
// MongoDB connection using Mongoose
// Much simpler than MySQL — no pool setup, no table creation needed
// Mongoose automatically creates collections when you first save data

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expenses_db');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// Define the Expense schema (like a table structure in SQL)
const expenseSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  amount:      { type: Number, required: true },
  category:    { type: String, required: true },
  date:        { type: Date,   required: true },
  description: { type: String, default: '' },
  bill_url:    { type: String, default: null },  // S3 URL for bill image
}, { timestamps: true }); // adds createdAt and updatedAt automatically

// Create the model (like a table in SQL)
const Expense = mongoose.model('Expense', expenseSchema);

module.exports = { connectDB, Expense };