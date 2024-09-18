const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Database connection setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Ensure this is set in your .env file
  ssl: {
    rejectUnauthorized: false
  }
});

// Create tables if they don't exist
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Customers (
        CustomerID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        FirstName STRING NOT NULL,
        LastName STRING NOT NULL,
        PhoneNumber STRING NOT NULL,
        City STRING NOT NULL,
        State STRING NOT NULL,
        PinCode STRING NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Addresses (
        AddressID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        CustomerID UUID REFERENCES Customers(CustomerID),
        AddressLine STRING NOT NULL,
        City STRING NOT NULL,
        State STRING NOT NULL,
        PinCode STRING NOT NULL
      );
    `);

    console.log("Tables created successfully");
  } catch (err) {
    console.error("Error creating tables", err);
  }
};

// Call the function to create tables
createTables();

// Create a new customer
app.post('/customers', async (req, res) => {
  const { FirstName, LastName, PhoneNumber, City, State, PinCode } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Customers (FirstName, LastName, PhoneNumber, City, State, PinCode)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [FirstName, LastName, PhoneNumber, City, State, PinCode]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creating customer' });
  }
});

// Read existing customer details by ID
app.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(SELECT * FROM Customers WHERE CustomerID = $1, [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error fetching customer details' });
  }
});

// Update customer information
app.put('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { FirstName, LastName, PhoneNumber } = req.body;
  try {
    const result = await pool.query(
      UPDATE Customers SET FirstName = $1, LastName = $2, PhoneNumber = $3 WHERE CustomerID = $4 RETURNING *,
      [FirstName, LastName, PhoneNumber, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error updating customer information' });
  }
});

// Delete customer record
app.delete('/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(DELETE FROM Customers WHERE CustomerID = $1, [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting customer record' });
  }
});

// View available multiple addresses by customer ID
app.get('/customers/:id/addresses', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(SELECT * FROM Addresses WHERE CustomerID = $1, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching addresses' });
  }
});

// Save updated multiple addresses
app.put('/addresses/:id', async (req, res) => {
  const { id } = req.params;
  const { AddressLine, City, State, PinCode } = req.body;
  try {
    const result = await pool.query(
      UPDATE Addresses SET AddressLine = $1, City = $2, State = $3, PinCode = $4 WHERE AddressID = $5 RETURNING *,
      [AddressLine, City, State, PinCode, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error updating address' });
  }
});

// Mark customer as having only one address
app.get('/customers/one-address', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.CustomerID, c.FirstName, c.LastName
      FROM Customers c
      LEFT JOIN Addresses a ON c.CustomerID = a.CustomerID
      GROUP BY c.CustomerID, c.FirstName, c.LastName
      HAVING COUNT(a.AddressID) = 1
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching customers with only one address' });
  }
});

// Search by City, State, or PinCode
app.get('/customers/search', async (req, res) => {
  const { City, State, PinCode } = req.query;
  try {
    let query = SELECT * FROM Customers WHERE 1=1;
    const queryParams = [];

    if (City) {
      queryParams.push(City);
      query += ` AND City = $${queryParams.length}`;
    }
    if (State) {
      queryParams.push(State);
      query += ` AND State = $${queryParams.length}`;
    }
    if (PinCode) {
      queryParams.push(PinCode);
      query += ` AND PinCode = $${queryParams.length}`;
    }

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error searching customers' });
  }
});

// Clear filters (can be handled on the frontend by resetting the query parameters)

// Page Navigation (handled on frontend by sending the appropriate offset and limit in the query)

// Start the server
app.listen(port, () => {
  console.log(Server is running on port ${port});
});