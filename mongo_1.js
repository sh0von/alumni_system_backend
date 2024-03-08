const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cookieParser());

// Connect to MongoDB
mongoose.connect('mongodb+srv://minarsvn:Minar909@cluster0.pad3few.mongodb.net/node?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

// Define Alumni schema
const alumniSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  username: String,
  password_hash: String,
  phone: String,
  address: String,
  batch: String,
  linkedin_url: String,
  facebook_url: String,
  bio: String,
  date_of_birth: String,
  now_working_on: String,
  approval: Boolean
});

const Alumni = mongoose.model('Alumni', alumniSchema);

// Signup route
app.post('/signup', async (req, res) => {
  const { first_name, last_name, username, email, password, phone, address, batch, linkedin_url, facebook_url, bio, date_of_birth, now_working_on } = req.body;
  
  try {
    // Check if username already exists
    const existingUser = await Alumni.findOne({ username } );
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // Create new alumni object
    const newAlumni = new Alumni({
      first_name,
      last_name,
      email,
      username,      password_hash: hash,
      phone: phone || '',
      address: address || '',
      batch: batch || '',
      linkedin_url: linkedin_url || '',
      facebook_url: facebook_url || '',
      bio: bio || '',
      date_of_birth: date_of_birth || '',
      now_working_on: now_working_on || '',
      approval: false
    });

    // Save new alumni to MongoDB
    await newAlumni.save();

    res.status(201).json({ message: 'Alumni registered successfully' });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ message: 'Error signing up' });
  }
});

// Update profile route (requires authentication)
app.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Alumni.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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

    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await Alumni.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await bcrypt.compare(password, user.password_hash);
    if (!result) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: 'alumni' }, 'secret', { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });

    res.json({ message: 'Login successful', token : token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Profile route (requires authentication)
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await Alumni.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Get profile route (for viewing other alumni profiles by username, requires authentication)
app.get('/profile/:username', authenticateToken, async (req, res) => {
  try {
    const username = req.params.username;
    const alumni = await Alumni.findOne({ username });
    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }
    res.json({
      alumni_id: alumni._id,
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
  } catch (error) {
    console.error('Error fetching alumni profile:', error);
    res.status(500).json({ message: 'Error fetching alumni profile' });
  }
});

// Alumni directory route with search (requires authentication)
app.get('/directory', authenticateToken, async (req, res) => {
  try {
    const { name, batch } = req.query;
    const query = {};
    if (name) {
      query.$or = [
        { first_name: { $regex: name, $options: 'i' } },
        { last_name: { $regex: name, $options: 'i' } }
      ];
    }
    if (batch) {
      query.batch = batch;
    }
    const alumni = await Alumni.find(query);
    res.json(alumni);
  } catch (error) {
    console.error('Error fetching alumni directory:', error);
    res.status(500).json({ message: 'Error fetching alumni directory' });
  }
});


// Logout route
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});
// Define Message schema
const messageSchema = new mongoose.Schema({
  sender_id: String,
  recipient_id: String,
  message_content: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);


app.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { recipient_id, message_content } = req.body;
    const sender_id = req.user.id;
  
    // Check if recipient exists
    const recipient = await Alumni.findById(recipient_id);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
  
    // Create new message object
    const newMessage = await Message.create({
      sender_id,
      recipient_id,
      message_content
    });
  
    res.status(201).json({ message: 'Message sent successfully', message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Retrieve messages route
app.get('/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
  
    // Retrieve messages for the user
    const receivedMessages = await Message.find({ recipient_id: userId });
  
    res.json(receivedMessages);
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ message: 'Error retrieving messages' });
  }
});


// Define Post schema
const postSchema = new mongoose.Schema({
    author_id: String,
    content: String,
    reactions: [String]
  });
  
  const Post = mongoose.model('Post', postSchema);
  // Create post route
  app.post('/posts', authenticateToken, async (req, res) => {
    try {
      const { content } = req.body;
      const userId = req.user.id; // Retrieve logged-in user's ID from JWT token
    
      // Create new post object
      const newPost = new Post({
        author_id: userId,
        content,
        reactions: []
      });
    
      // Save new post to MongoDB
      await newPost.save();
    
      res.status(201).json({ message: 'Post created successfully', post: newPost });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ message: 'Error creating post' });
    }
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
app.post('/posts/:postId/react', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const reaction = req.body.reaction;
    const userId = req.user.id;
  
    // Find the post in the database
    const post = await Post.findById(postId);
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
  
    // Save changes to the post in MongoDB
    await post.save();
  
    res.json({ message: 'Reaction updated successfully', post });
  } catch (error) {
    console.error('Error reacting to post:', error);
    res.status(500).json({ message: 'Error reacting to post' });
  }
});

// Get individual post route
app.get('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
  
    // Find the post by its ID in the database
    const post = await Post.findById(postId);
  
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
      post_id: post._id,
      author_id: post.author_id,
      content: post.content,
      reactions: post.reactions,
      likeCount: likeCount,
      isLiked: isLiked
    };
  
    res.json(postData);
  } catch (error) {
    console.error('Error retrieving post:', error);
    res.status(500).json({ message: 'Error retrieving post' });
  }
});

// Edit post route
app.put('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { content } = req.body;
    const userId = req.user.id;
  
    // Find the post by its ID in the database
    const post = await Post.findById(postId);
  
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
    // Check if the logged-in user is the author of the post
    if (post.author_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to edit this post' });
    }
  
    // Update the content of the post
    post.content = content;
  
    // Save changes to the post in MongoDB
    await post.save();
  
    res.json({ message: 'Post updated successfully', post });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Error updating post' });
  }
});

// Delete post route
app.delete('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
  
    // Find the post by its ID in the database
    const post = await Post.findById(postId);
  
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
    // Check if the logged-in user is the author of the post
    const userId = req.user.id;
    if (post.author_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this post' });
    }
  
    // Remove the post from MongoDB
    await post.remove();
  
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
});

// Search posts route
app.get('/search/post', async (req, res) => {
  try {
    const { keyword, author, batch } = req.query;
  
    let query = {};
    if (keyword) {
      query.content = { $regex: keyword, $options: 'i' };
    }
    if (author) {
      query.author_id = author;
    }
    if (batch) {
      // Assuming batch is a field in the author's schema
      query.batch = batch;
    }
  
    const filteredPosts = await Post.find(query);
  
    res.json(filteredPosts);
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ message: 'Error searching posts' });
  }
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
    req.user = user;
    next();
  });
}



// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
