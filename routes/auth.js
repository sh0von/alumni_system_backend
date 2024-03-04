const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticateToken = require('./authentication');
const fs = require('fs');

const db = JSON.parse(fs.readFileSync('db.json'));




router.post('/signup', (req, res) => {
    const { first_name, last_name, email, password, phone, address, batch, linkedin_url, facebook_url, bio, date_of_birth, now_working_on } = req.body;
  
   
    const username = generateUsername(first_name, last_name);
  
   
    const existingUser = db.alumni.find(alumni => alumni.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
  
   
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        return res.status(500).json({ message: 'Error hashing password' });
      }
  
     
      const newAlumni = {
        alumni_id: db.alumni.length + 1,
        first_name,
        last_name,
        email,
        username,
        password_hash: hash,
        phone: phone || '',
        address: address || '',
        batch: batch || '',
        linkedin_url: linkedin_url || '',
        facebook_url: facebook_url || '',
        bio: bio || '',
        date_of_birth: date_of_birth || '',
        now_working_on: now_working_on || '',
        approval: false
      };
  
     
      db.alumni.push(newAlumni);
  
     
      fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
      res.status(201).json({ message: 'Alumni registered successfully' });
    });
  });


router.post('/login', (req, res) => {
    const { username, password } = req.body;
  
   
    const user = db.alumni.find(alumni => alumni.username === username);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
  
   
    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
     
      const token = jwt.sign({ id: user.alumni_id, role: 'alumni' }, 'secret', { expiresIn: '1h' });
  
     
      res.cookie('token', token, { httpOnly: true });
  
      res.json({ message: 'Login successful' });
    });
  });


router.post('/logout', (req, res) => {
   
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
  });


function generateUsername(firstName, lastName) {
    const sanitizedFirstName = firstName.toLowerCase().replace(/\s/g, '');
    const sanitizedLastName = lastName.toLowerCase().replace(/\s/g, '');
    return sanitizedFirstName + '.' + sanitizedLastName;
}

module.exports = router;
