const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false
}));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'yournewpassword',
  database: 'farmdb'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected');
});

// ROUTES
// app.get('/', (req, res) => res.redirect('/login.html'));

// Register
app.post('/register', (req, res) => {
  const { username, password, name, contact } = req.body;
  db.query('INSERT INTO users (username, password, name,contact) VALUES (?, ?, ?, ?)', [username, password, name, contact], err => {
    if (err) return res.send('Registration failed');
    res.redirect('/login.html');
  });
});











// Login
app.post('/login', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.send('Please fill in all fields.');
  }

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Internal server error');
    }

    if (results.length === 0) {
      return res.send('Login failed: Invalid username or password');
    }

    // Only redirect once here
    req.session.userId = results[0].id;

    if (role === 'admin') {
      req.session.admin = true;
      res.redirect('/admin-dashboard.html');
    } else if (role === 'farmer') {
      req.session.farmer = true;
      res.redirect('/dashboard.html');
    } else {
      res.send('Unknown role selected');
    }
  });
});






// GET reminders for a date
app.get('/get-reminders/:farmer_ID', (req, res) => {
  const farmer_ID = req.params.farmer_ID;
  const date = req.query.date;

  const query = `
    SELECT * FROM reminder
    WHERE reminder_date = ? AND (farmer_ID = ? OR farmer_ID IS NULL)
    ORDER BY created_at DESC
  `;

  db.query(query, [date, farmer_ID], (err, results) => {
    if (err) {
      console.error('Error fetching reminders:', err);
      return res.status(500).json({ error: 'Failed to load reminders' });
    }
    res.json(results);
  });
});

// POST add new reminder
app.post('/add-reminder', (req, res) => {
  const { farmer_ID, title, note, reminder_date } = req.body;

  const query = `
    INSERT INTO reminder (farmer_ID, title, note, reminder_date)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [farmer_ID, title, note, reminder_date], (err, result) => {
    if (err) {
      console.error('Error adding reminder:', err);
      return res.status(500).json({ error: 'Failed to add reminder' });
    }
    res.status(200).json({ success: true });
  });
});

// PUT update reminder
app.put('/update-reminder/:id', (req, res) => {
  const reminder_ID = req.params.id;
  const { title, note } = req.body;

  const query = `
    UPDATE reminder
    SET title = ?, note = ?
    WHERE reminder_ID = ?
  `;

  db.query(query, [title, note, reminder_ID], (err, result) => {
    if (err) {
      console.error('Error updating reminder:', err);
      return res.status(500).json({ error: 'Failed to update reminder' });
    }
    res.json({ success: true });
  });
});












// DEPENDENTS
app.post('/add-dependent', (req, res) => {
  const { worker_id, name, relation } = req.body;
  db.query('INSERT INTO dependents (worker_id, name, relation) VALUES (?, ?, ?)', [worker_id, name, relation], err => {
    if (err) return res.status(500).send('Error');
    res.send('Dependent added');
  });
});

app.get('/get-dependents/:workerId', (req, res) => {
  db.query('SELECT * FROM dependents WHERE worker_id = ?', [req.params.workerId], (err, results) => {
    if (err) return res.status(500).send('Error');
    res.json(results);
  });
});








app.get('/get-all-users', (req, res) => {
  db.query('SELECT username, name, contact FROM users', (err, results) => {
    if (err) return res.status(500).send('Database error.');
    res.json(results); // Send full list
  });
});

app.post('/update-profile', (req, res) => {
  const { username, name, contact } = req.body;

  if (!username || !name || !contact) {
    return res.status(400).json({ success: false, message: 'All fields are required!' });
  }

  // Update both name and contact
  const updateQuery = 'UPDATE users SET name = ?, contact = ? WHERE username = ?';
  db.query(updateQuery, [name, contact, username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error occurred.' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true });
  });
});


app.post('/set-password', (req, res) => {
  const { username, password } = req.body;

  console.log('Received Username:', username); // Log to check incoming data
  console.log('Received Password:', password); // Log to check incoming data

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and Password are required.' });
  }

  const updateQuery = 'UPDATE users SET password = ? WHERE username = ?';
  db.query(updateQuery, [password, username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error occurred.' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true });
  });
});

// Delete a user
app.delete('/delete-user', (req, res) => {
  const { username } = req.query;

  const deleteQuery = 'DELETE FROM users WHERE username = ?';
  db.query(deleteQuery, [username], (err, results) => {
    if (err) return res.status(500).send('Database error.');
    if (results.affectedRows === 0) return res.status(404).send('User not found.');
    res.send('User deleted successfully');
  });
});





// Allowed menu-driven values
const ALLOWED_TYPES = ['Cereal', 'Vegetable', 'Fruit', 'Pulse', 'Oilseed'];
const ALLOWED_SEASONS = ['Kharif', 'Rabi', 'Zaid'];
const ALLOWED_STAGES = ['Seedling','Sowing', 'Germination', 'Vegetative', 'Flowering', 'Fruiting','Maturity'];


app.post('/add-crop', (req, res) => {
  const { name, type, season, planting_date, harvesting_date, growth_stage } = req.body;

  // Retrieve user_id from session
  const user_id = req.session.userId; // Corrected to match the login route

  if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized: No user logged in' });
  }

  // Validate type, season, and growth stage
  if (!ALLOWED_TYPES.includes(type) || !ALLOWED_SEASONS.includes(season) || !ALLOWED_STAGES.includes(growth_stage)) {
      return res.status(400).json({ error: 'Invalid type, season, or growth stage' });
  }

  // SQL Query to insert the crop data
  const sql = `
      INSERT INTO crops (user_id, name, type, season, planting_date, harvesting_date, growth_stage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [user_id, name, type, season, planting_date, harvesting_date, growth_stage], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Crop added successfully', cropId: result.insertId });
  });
});


// Get All Crops
app.get('/get-crops', (req, res) => {
    const sql = `SELECT id, user_id, name, type, season, planting_date, harvesting_date, growth_stage FROM crops`;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Update Growth Stage and append new value to previous one
app.put('/update-growth-stage/:id', (req, res) => {
  const { growth_stage } = req.body;
  const cropId = req.params.id;

  if (!ALLOWED_STAGES.includes(growth_stage)) {
      return res.status(400).json({ error: 'Invalid growth stage' });
  }

  // Step 1: Get the current growth stage from the database
  db.query('SELECT growth_stage FROM crops WHERE id = ?', [cropId], (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Crop not found' });
      }

      const currentGrowthStage = results[0].growth_stage || '';

      // Step 2: Append the new growth stage to the current one
      const updatedGrowthStage = currentGrowthStage ? currentGrowthStage + ' -> ' + growth_stage : growth_stage;

      // Step 3: Update the growth stage in the database
      const sql = 'UPDATE crops SET growth_stage = ? WHERE id = ?';
      db.query(sql, [updatedGrowthStage, cropId], (err, result) => {
          if (err) {
              console.error(err);
              return res.status(500).json({ error: 'Database error' });
          }
          res.json({ message: 'Growth stage updated successfully' });
      });
  });
});


// Delete Crop
app.delete('/delete-crop/:id', (req, res) => {
    const cropId = req.params.id;

    const sql = `DELETE FROM crops WHERE id = ?`;
    
    db.query(sql, [cropId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Crop deleted successfully' });
    });
});

// GROWTH STAGES
app.get('/growth-stages', (req, res) => {
  db.query('SELECT * FROM growth_stages', (err, results) => {
    if (err) return res.status(500).send('Error');
    res.json(results);
  });
});


// Database setup (use your preferred database)
const workers = [];  // Temporary array, replace with DB queries

app.use(cors());
app.use(bodyParser.json());

// Get workers
app.get('/get-workers', (req, res) => {
  const sql = 'SELECT * FROM workers';  // Modify query if needed
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error fetching workers:', err);
      return res.status(500).send('Failed to fetch workers');
    }
    res.status(200).json(result);  // Send the workers data as JSON response
  });
});


app.post('/add-worker', (req, res) => {
  const { name, contact, daily_wages, total_Payment, workType, Duration, hire_Date } = req.body;

  const workTypeString = Array.isArray(workType) ? workType.join(", ") : workType; // If workType is array, join it
  const sql = 'INSERT INTO workers (name, contact, daily_wages, total_payment, working_type, duration, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?)';

  db.query(sql, [name, contact, daily_wages, total_Payment, workTypeString, Duration, hire_Date], (err, result) => {
    if (err) {
      console.error('Error inserting worker:', err);
      res.status(500).send('Failed to add worker.');
    } else {
      res.status(200).send('Worker added successfully.');
    }
  });
});


app.post('/update-worker-type', (req, res) => {
  const { worker, newWorkType } = req.body;

  // Step 1: Get the existing worker from the database
  const sql = 'SELECT * FROM workers WHERE name = ?';
  db.query(sql, [worker], (err, result) => {
    if (err) {
      console.error('Error fetching worker:', err);
      return res.status(500).send('Failed to fetch worker');
    }

    if (result.length === 0) {
      return res.status(404).send('Worker not found');
    }

    const foundWorker = result[0];
    let currentWorkTypes = foundWorker.working_type ? foundWorker.working_type.split(', ') : [];

    // Step 2: Check if the new work type already exists
    if (currentWorkTypes.includes(newWorkType)) {
      return res.status(200).send('Work type already exists');
    }

    // Step 3: Append the new work type
    currentWorkTypes.push(newWorkType);

    // Step 4: Update the worker in the database
    const updatedWorkTypes = currentWorkTypes.join(', ');  // Convert array back to a comma-separated string

    const updateSql = 'UPDATE workers SET working_type = ? WHERE name = ?';
    db.query(updateSql, [updatedWorkTypes, worker], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error updating worker:', updateErr);
        return res.status(500).send('Failed to update work type');
      }

      res.status(200).send('Work type added successfully');
    });
  });
});

// Delete worker
app.delete('/delete-worker', (req, res) => {
  const { name } = req.body;

  const sql = 'DELETE FROM workers WHERE name = ?';  // Delete query for MySQL
  db.query(sql, [name], (err, result) => {
    if (err) {
      console.error('Error deleting worker:', err);
      return res.status(500).send('Failed to delete worker');
    }

    if (result.affectedRows > 0) {
      res.status(200).send('Worker deleted successfully!');
    } else {
      res.status(404).send('Worker not found');
    }
  });
});

// STOCK
// Add Stock
app.post('/add-stock', (req, res) => {
  const { item, stockType, price, purchaseDate, totalQuantity, currentQuantity } = req.body;
  const userId = req.session.userId; // Make sure user is logged in and this exists

  if (!userId) return res.status(401).send('Unauthorized');

  const sql = `
    INSERT INTO stock 
    (user_id, item, stockType, price, purchaseDate, totalQuantity, currentQuantity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [userId, item, stockType, price, purchaseDate, totalQuantity, currentQuantity], err => {
    if (err) {
      console.error('Error inserting stock:', err);
      return res.status(500).send('Error adding stock');
    }
    res.send('Stock added successfully');
  });
});

app.get('/get-stock', (req, res) => {
  db.query('SELECT * FROM stock WHERE user_id = ?', [req.session.userId], (err, results) => {
    if (err) return res.status(500).send('Error');
    res.json(results);
  });
});

// STOCK - Update Current Quantity
app.post('/update-stock', (req, res) => {
  const { item, newQuantity } = req.body;

  if (!item || typeof newQuantity !== 'number') {
    return res.status(400).send('Item and valid quantity required');
  }

  const sql = `
    UPDATE stock 
    SET currentQuantity = ? 
    WHERE user_id = ? AND item = ?
  `;

  db.query(sql, [newQuantity, req.session.userId, item], (err, result) => {
    if (err) {
      console.error('Error updating stock:', err);
      return res.status(500).send('Server error');
    }

    if (result.affectedRows === 0) {
      return res.status(404).send('Stock item not found');
    }

    res.send('Stock quantity updated successfully');
  });
});


app.delete('/delete-stock', (req, res) => {
  const { item } = req.body;
  const userId = req.session.userId;

  if (!userId) return res.status(401).send('Unauthorized');

  const sql = "DELETE FROM stock WHERE item = ? AND user_id = ?";
  db.query(sql, [item, userId], (err, result) => {
    if (err) {
      console.error('Error deleting stock:', err);
      return res.status(500).send('Error deleting stock');
    }
    res.send('Stock deleted');
  });
});


// LOW STOCK NOTIFICATION
// Route to fetch low stock items
app.get('/low-stock', (req, res) => {
  db.query('SELECT * FROM stock WHERE user_id = ? AND currentQuantity = 1', [req.session.userId], (err, results) => {
    if (err) return res.status(500).send('Error fetching low stock items');
    res.json(results);  // Send the low stock items as JSON
  });
});


app.listen(3000, () => console.log('Server started on http://localhost:3000'));
