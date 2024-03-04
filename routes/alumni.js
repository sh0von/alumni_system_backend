const express = require('express');
const router = express.Router();
const authenticateToken = require('./authentication');
const fs = require('fs');

const db = JSON.parse(fs.readFileSync('db.json'));




router.get('/profile', authenticateToken, (req, res) => {
 
  const userId = req.user.id;

 
  const user = db.alumni.find(alumni => alumni.alumni_id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

 
  res.json(user);
});


router.get('/profile/:username', authenticateToken, (req, res) => {
 
  const username = req.params.username;

 
  const alumni = db.alumni.find(alumni => alumni.username === username);
  if (!alumni) {
    return res.status(404).json({ message: 'Alumni not found' });
  }

 
  res.json({
    alumni_id: alumni.alumni_id,
    first_name: alumni.first_name,
    last_name: alumni.last_name,
    email: alumni.email,
    batch: alumni.batch,
    linkedin_url: alumni.linkedin_url,
    facebook_url: alumni.facebook_url,
    bio: alumni.bio,
    date_of_birth: alumni.date_of_birth,
    now_working_on: alumni.now_working_on
  });
});


router.get('/directory', authenticateToken, (req, res) => {
  const { name, batch } = req.query;
  let filteredAlumni = [...db.alumni];

 
  if (name) {
    const searchRegex = new RegExp(name, 'i');
    filteredAlumni = filteredAlumni.filter(alumni => searchRegex.test(alumni.first_name) || searchRegex.test(alumni.last_name));
  }

 
  if (batch) {
    filteredAlumni = filteredAlumni.filter(alumni => alumni.batch === batch);
  }

 
  const alumniProfiles = filteredAlumni.map(alumni => ({
    alumni_id: alumni.alumni_id,
    first_name: alumni.first_name,
    last_name: alumni.last_name,
    batch: alumni.batch,
    now_working_on: alumni.now_working_on
  }));

  res.json(alumniProfiles);
});

module.exports = router;
