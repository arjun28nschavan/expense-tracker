// routes/expenses.js
// All expense routes using MongoDB via Mongoose

const express = require('express');
const router = express.Router();
const { Expense } = require('../config/db');
const { upload, deleteFromS3 } = require('../config/s3');

// ─────────────────────────────────────────
// GET /expenses — fetch all and render homepage
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Find all expenses, newest first
    const expenses = await Expense.find().sort({ date: -1, createdAt: -1 });

    // Total amount
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    res.render('index', {
      expenses,
      total: total.toFixed(2),
      byCategory,
      error: null,
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.render('index', {
      expenses: [],
      total: '0.00',
      byCategory: {},
      error: 'Could not load expenses. Check your MongoDB connection.',
    });
  }
});

// ─────────────────────────────────────────
// POST /expenses — add new expense
// ─────────────────────────────────────────
router.post('/', upload.single('bill'), async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Title, amount, category, and date are required' });
    }

    const billUrl = req.file ? req.file.location : null;

    // Create and save the expense — Mongoose handles everything
    const expense = new Expense({
      title,
      amount: parseFloat(amount),
      category,
      date: new Date(date),
      description: description || '',
      bill_url: billUrl,
    });

    await expense.save();
    console.log(`Expense added: ${title} ₹${amount}`);
    res.redirect('/expenses');
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ error: 'Failed to add expense: ' + err.message });
  }
});

// ─────────────────────────────────────────
// DELETE /expenses/:id — delete expense
// ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Delete bill from S3 if exists
    if (expense.bill_url) {
      await deleteFromS3(expense.bill_url);
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete: ' + err.message });
  }
});

module.exports = router;