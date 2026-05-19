const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = async (req, res, next) => {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from format "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production');

            // Attach user data to request object
            req.user = {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name
            };

            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ 
                success: false, 
                message: 'Not authorized, token failed or expired' 
            });
        }
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authorized, token is missing' 
        });
    }
};

module.exports = { protect };
