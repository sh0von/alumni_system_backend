const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Load database
const db = JSON.parse(fs.readFileSync('db.json'));

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
// Signup route
app.post('/signup', (req, res) => {
    const { first_name, last_name, email, password, phone, address, batch, linkedin_url, facebook_url, bio, date_of_birth, now_working_on } = req.body;
  
    // Generate username from first and last name
    const username = generateUsername(first_name, last_name);
  
    // Check if username already exists
    const existingUser = db.alumni.find(alumni => alumni.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
  
    // Hash password
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        return res.status(500).json({ message: 'Error hashing password' });
      }
  
      // Create new alumni object with default empty values
      const newAlumni = {
        alumni_id: db.alumni.length + 1, // Generate unique ID
        first_name,
        last_name,
        email,
        username,
        password_hash: hash,
        phone: phone || '', // Set to empty string if not provided
        address: address || '',
        batch: batch || '',
        linkedin_url: linkedin_url || '',
        facebook_url: facebook_url || '',
        bio: bio || '',
        date_of_birth: date_of_birth || '',
        now_working_on: now_working_on || '',
        approval: false // Default approval status
      };
  
      // Add new alumni to the database
      db.alumni.push(newAlumni);
  
      // Save changes to db.json
      fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
      res.status(201).json({ message: 'Alumni registered successfully' });
    });
  });
  
// Update profile route (requires authentication)
app.put('/profile', authenticateToken, (req, res) => {
    // Get user ID from token
    const userId = req.user.id;
  
    // Find user in the database
    const userIndex = db.alumni.findIndex(alumni => alumni.alumni_id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
  
    const user = db.alumni[userIndex];
  
    // Update user details
    const { first_name, last_name, phone, email, address, batch, linkedin_url, facebook_url, bio, date_of_birth, now_working_on } = req.body;
  
    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.phone = phone || user.phone;
    user.email = email || user.email;
    user.address = address || user.address;
    user.batch = batch || user.batch;
    user.linkedin_url = linkedin_url || user.linkedin_url;
    user.facebook_url = facebook_url || user.facebook_url;
    user.bio = bio || user.bio;
    user.date_of_birth = date_of_birth || user.date_of_birth;
    user.now_working_on = now_working_on || user.now_working_on;
  
    // Update user in the database
    db.alumni[userIndex] = user;
  
    // Save changes to db.json
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.json({ message: 'Profile updated successfully', user });
  });
  
// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    // Find user in the database
    const user = db.alumni.find(alumni => alumni.username === username);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
  
    // Compare password
    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Generate JWT token
      const token = jwt.sign({ id: user.alumni_id, role: 'alumni' }, 'secret', { expiresIn: '1h' });
  
      // Set JWT token as a cookie
      res.cookie('token', token, { httpOnly: true });
  
      res.json({ message: 'Login successful' });
    });
  });
  
// Profile route (requires authentication)
app.get('/profile', authenticateToken, (req, res) => {
  // Get user ID from token
  const userId = req.user.id;

  // Find user in the database
  const user = db.alumni.find(alumni => alumni.alumni_id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Return user profile
  res.json(user);
});

// Get profile route (for viewing other alumni profiles by username, requires authentication)
app.get('/profile/:username', authenticateToken, (req, res) => {
    // Get username from URL params
    const username = req.params.username;
  
    // Find alumni in the database
    const alumni = db.alumni.find(alumni => alumni.username === username);
    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }
  
    // Return alumni profile
    res.json({ alumni_id: alumni.alumni_id, first_name: alumni.first_name, last_name: alumni.last_name, email: alumni.email, batch: alumni.batch, linkedin_url: alumni.linkedin_url, facebook_url: alumni.facebook_url, bio: alumni.bio, date_of_birth: alumni.date_of_birth, now_working_on: alumni.now_working_on });
  });

    // Alumni directory route with search (requires authentication)
app.get('/directory', authenticateToken, (req, res) => {
  const { name, batch } = req.query;
  let filteredAlumni = [...db.alumni];

  // Filter alumni by name
  if (name) {
    const searchRegex = new RegExp(name, 'i');
    filteredAlumni = filteredAlumni.filter(alumni => searchRegex.test(alumni.first_name) || searchRegex.test(alumni.last_name));
  }

  // Filter alumni by batch
  if (batch) {
    filteredAlumni = filteredAlumni.filter(alumni => alumni.batch === batch);
  }

  // Map filtered alumni profiles
  const alumniProfiles = filteredAlumni.map(alumni => ({
    alumni_id: alumni.alumni_id,
    first_name: alumni.first_name,
    last_name: alumni.last_name,
    batch: alumni.batch,
    now_working_on: alumni.now_working_on
  }));

  res.json(alumniProfiles);
});

// Send message route
app.post('/messages', authenticateToken, (req, res) => {
    const { recipient_id, message_content } = req.body;
    const sender_id = req.user.id;
  
    // Check if recipient exists
    const recipient = db.alumni.find(alumni => alumni.alumni_id === recipient_id);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
  
    // Create new message object
    const message = {
      message_id: db.messages.length + 1, // Generate unique ID
      sender_id,
      recipient_id,
      message_content,
      timestamp: new Date().toISOString()
    };
  
    // Add message to the messages array
    db.messages.push(message);
  
    // Save changes to db.json
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.status(201).json({ message: 'Message sent successfully' });
  });
  
  // Retrieve messages route
  app.get('/messages', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
    // Retrieve messages for the user
    const receivedMessages = db.messages.filter(message => message.recipient_id === userId);
  
    res.json(receivedMessages);
  });


// Create post route
app.post('/posts', authenticateToken, (req, res) => {
    const { content } = req.body;
    const userId = req.user.id; // Retrieve logged-in user's ID from JWT token
  
    // Create new post object
    const newPost = {
      post_id: db.posts.length + 1,
      author_id: userId, // Set author ID to logged-in user's ID
      content,
      reactions: []
    };
  
    // Add new post to the timeline
    db.posts.unshift(newPost);
  
    // Save changes to db.json
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.status(201).json({ message: 'Post created successfully', post: newPost });
  });
  
  
// Get posts route
app.get('/posts', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
    // Retrieve posts from the timeline
    const postsWithLikes = db.posts.map(post => ({
      ...post,
      isLiked: post.reactions.includes(userId),
      likeCount: post.reactions.length
    }));
  
    res.json(postsWithLikes);
  });
  // Get posts route
app.get('/posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
  
    // Retrieve posts from MongoDB
    const posts = await Post.find();
  
    // Process posts to include like status and count
    const postsWithLikes = posts.map(post => ({
      ...post.toObject(),
      isLiked: post.reactions.includes(userId),
      likeCount: post.reactions.length
    }));
  
    res.json(postsWithLikes);
  } catch (error) {
    console.error('Error retrieving posts:', error);
    res.status(500).json({ message: 'Error retrieving posts' });
  }
});

  // React to post route
  app.post('/posts/:postId/react', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
    const reaction = req.body.reaction;
    const userId = req.user.id;
  
    // Find the post in the timeline
    const post = db.posts.find(post => post.post_id === postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
    // Add or remove reaction based on the user's action
    if (reaction === 'like') {
      if (!post.reactions.includes(userId)) {
        post.reactions.push(userId);
      } else {
        post.reactions = post.reactions.filter(id => id !== userId);
      }
    }
  
    // Save changes to db.json
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.json({ message: 'Reaction updated successfully', post });
  });
  
  // Get individual post route
app.get('/posts/:postId', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
  
    // Find the post by its ID
    const post = db.posts.find(post => post.post_id === postId);
  
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
    // Calculate like count
    const likeCount = post.reactions.length;
  
    // Check if the logged-in user has liked the post
    const userId = req.user.id;
    const isLiked = post.reactions.includes(userId);
  
    // Construct the response
    const postData = {
      post_id: post.post_id,
      author_id: post.author_id,
      content: post.content,
      reactions: post.reactions,
      likeCount: likeCount,
      isLiked: isLiked
    };
  
    res.json(postData);
  });
// Edit post route
app.put('/posts/:postId', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    const userId = req.user.id;
  
    // Find the post by its ID
    const postIndex = db.posts.findIndex(post => post.post_id === postId);
  
    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
    // Check if the logged-in user is the author of the post
    if (db.posts[postIndex].author_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to edit this post' });
    }
  
    // Update the content of the post
    db.posts[postIndex].content = content;
  
    // Save changes to db.json
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.json({ message: 'Post updated successfully', post: db.posts[postIndex] });
  });
    
// Delete post route
app.delete('/posts/:postId', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
  
    // Find the index of the post in the array
    const index = db.posts.findIndex(post => post.post_id === postId);
  
    if (index === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
    // Check if the logged-in user is the author of the post
    const userId = req.user.id;
    const authorId = db.posts[index].author_id;
    if (userId !== authorId) {
      return res.status(403).json({ message: 'Unauthorized to delete this post' });
    }
  
    // Remove the post from the array
    db.posts.splice(index, 1);
  
    // Save changes to db.json
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.json({ message: 'Post deleted successfully' });
  });
// Search posts route
app.get('/search/post', (req, res) => {
    const { keyword, author, batch } = req.query;
  
    if (!keyword && !author && !batch) {
      return res.status(400).json({ message: 'At least one search criteria is required' });
    }
  
    let filteredPosts = db.posts;
  
    if (keyword) {
      filteredPosts = filteredPosts.filter(post => post.content.includes(keyword));
    }
    if (author) {
      filteredPosts = filteredPosts.filter(post => post.author_id === parseInt(author));
    }
    if (batch) {
      // Get the alumni with the specified batch
      const alumniWithBatch = db.alumni.filter(alumni => alumni.batch === batch);
      // Filter posts by author ID matching alumni ID and batch
      filteredPosts = filteredPosts.filter(post => {
        const authorAlumni = alumniWithBatch.find(alumni => alumni.alumni_id === post.author_id);
        return authorAlumni !== undefined;
      });
    }
  
    res.json(filteredPosts);
  });
  
  
  
// Logout route
app.post('/logout', (req, res) => {
    // Clear JWT token from client-side storage (e.g., browser local storage)
    res.clearCookie('token'); // Clear token cookie
    res.json({ message: 'Logout successful' });
  });
    
// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    // Check if the token has expired
    const currentTimestamp = Math.floor(Date.now() / 1000); // Convert milliseconds to seconds
    if (user.exp && user.exp < currentTimestamp) {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    req.user = user;
    next();
  });
}


// Function to generate username from first and last name
function generateUsername(firstName, lastName) {
  const sanitizedFirstName = firstName.toLowerCase().replace(/\s/g, ''); // Remove spaces and convert to lowercase
  const sanitizedLastName = lastName.toLowerCase().replace(/\s/g, '');
  return sanitizedFirstName + '.' + sanitizedLastName; // Concatenate first name and last name with a dot
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
