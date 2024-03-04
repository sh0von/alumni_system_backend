


const jwt = require('jsonwebtoken');


function authenticateToken(req, res, next) {
    const token = req.cookies.token;
  
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    jwt.verify(token, 'secret', (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
     
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (user.exp && user.exp < currentTimestamp) {
        return res.status(401).json({ message: 'Token has expired' });
      }
      
      req.user = user;
      next();
    });
  }
  module.exports = authenticateToken;