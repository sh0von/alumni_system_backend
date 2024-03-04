const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const authenticationRoutes = require('./routes/auth');
const alumniRoutes = require('./routes/alumni');
const postsRoutes = require('./routes/posts');
const messagesRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;
// Load database
const db = JSON.parse(fs.readFileSync('db.json'));

app.use(bodyParser.json());
app.use(cookieParser());

// Mounting routes

app.use('/auth', authenticationRoutes);
app.use('/alumni', alumniRoutes);
app.use('/posts', postsRoutes);
app.use('/messages', messagesRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
