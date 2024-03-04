const express = require('express');
const router = express.Router();
const authenticateToken = require('./authentication');
const fs = require('fs');

const db = JSON.parse(fs.readFileSync('db.json'));


router.post('/posts', authenticateToken, (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
  
   
    const newPost = {
      post_id: db.posts.length + 1,
      author_id: userId,
      content,
      reactions: []
    };
  
   
    db.posts.unshift(newPost);
  
   
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.status(201).json({ message: 'Post created successfully', post: newPost });
  });
  
  

router.get('/posts', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
   
    const postsWithLikes = db.posts.map(post => ({
      ...post,
      isLiked: post.reactions.includes(userId),
      likeCount: post.reactions.length
    }));
  
    res.json(postsWithLikes);
  });
  
 
  router.post('/posts/:postId/react', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
    const reaction = req.body.reaction;
    const userId = req.user.id;
  
   
    const post = db.posts.find(post => post.post_id === postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
   
    if (reaction === 'like') {
      if (!post.reactions.includes(userId)) {
        post.reactions.push(userId);
      } else {
        post.reactions = post.reactions.filter(id => id !== userId);
      }
    }
  
   
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.json({ message: 'Reaction updated successfully', post });
  });
  
 
  router.get('/posts/:postId', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
  
   
    const post = db.posts.find(post => post.post_id === postId);
  
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
   
    const likeCount = post.reactions.length;
  
   
    const userId = req.user.id;
    const isLiked = post.reactions.includes(userId);
  
   
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

router.put('/posts/:postId', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    const userId = req.user.id;
  
   
    const postIndex = db.posts.findIndex(post => post.post_id === postId);
  
    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
   
    if (db.posts[postIndex].author_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to edit this post' });
    }
  
   
    db.posts[postIndex].content = content;
  
   
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.json({ message: 'Post updated successfully', post: db.posts[postIndex] });
  });
    

router.delete('/posts/:postId', authenticateToken, (req, res) => {
    const postId = parseInt(req.params.postId);
  
   
    const index = db.posts.findIndex(post => post.post_id === postId);
  
    if (index === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }
  
   
    const userId = req.user.id;
    const authorId = db.posts[index].author_id;
    if (userId !== authorId) {
      return res.status(403).json({ message: 'Unauthorized to delete this post' });
    }
  
   
    db.posts.splice(index, 1);
  
   
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
  
    res.json({ message: 'Post deleted successfully' });
  });

router.get('/search/post', (req, res) => {
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
     
      const alumniWithBatch = db.alumni.filter(alumni => alumni.batch === batch);
     
      filteredPosts = filteredPosts.filter(post => {
        const authorAlumni = alumniWithBatch.find(alumni => alumni.alumni_id === post.author_id);
        return authorAlumni !== undefined;
      });
    }
  
    res.json(filteredPosts);
  });
  

module.exports = router;