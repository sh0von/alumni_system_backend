const express = require('express');
const router = express.Router();
const authenticateToken = require('./authentication');
const fs = require('fs');

const db = JSON.parse(fs.readFileSync('db.json'));


router.post('/messages', authenticateToken, (req, res) => {
    const { recipient_id, message_content } = req.body;
    const sender_id = req.user.id;
  
   
    const recipient = db.alumni.find(alumni => alumni.alumni_id === recipient_id);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
  
   
    const message = {
      message_id: db.messages.length + 1,
      sender_id,
      recipient_id,
      message_content,
      timestamp: new Date().toISOString()
    };
  
   
    db.messages.push(message);
  
   
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.status(201).json({ message: 'Message sent successfully' });
  });
  
 
  router.get('/messages', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
   
    const receivedMessages = db.messages.filter(message => message.recipient_id === userId);
  
    res.json(receivedMessages);
  });
  
  

module.exports = router;