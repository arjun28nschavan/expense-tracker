const express = require('express');
const path = require('path');
require('dotenv').config();

const expenseRoutes = require('./routes/expenses');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/expenses', expenseRoutes);

app.get('/', (req, res) => {
  res.redirect('/expenses');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Expense Tracker running on http://localhost:${PORT}`);
});