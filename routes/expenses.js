const express = require('express');
const router = express.Router();
const docClient = require('../config/dynamo');
const { v4: uuidv4 } = require('uuid');
const { upload } = require('../config/s3');

const { PutCommand, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

// GET
router.get('/', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({
      TableName: "expenses"
    }));

    const expenses = data.Items || [];

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    res.render('index', {
      expenses,
      total: total.toFixed(2),
      byCategory,
      error: null
    });

  } catch (err) {
    res.render('index', {
      expenses: [],
      total: "0.00",
      byCategory: {},
      error: "DynamoDB error"
    });
  }
});

// POST
router.post('/', upload.single('bill'), async (req, res) => {
  try {
    const { title, amount, category, subcategory, date, description } = req.body;

    const billUrl = req.file ? req.file.location : null;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: "All fields required" });
    }

    const newExpense = {
    id: uuidv4(),
    title,
    amount: parseFloat(amount),
    category,
    subcategory,
    date,
    description: description || "",
    bill_url: billUrl
  };

    await docClient.send(new PutCommand({
      TableName: "expenses",
      Item: newExpense
    }));

    res.redirect('/expenses');

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await docClient.send(new DeleteCommand({
      TableName: "expenses",
      Key: { id: req.params.id }
    }));

    res.json({ success: true });

  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;