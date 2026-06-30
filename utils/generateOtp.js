var jwt = require('jsonwebtoken');

function generateToken(id) {
    const token = jwt.sign(
        { id: id }, 
        process.env.SECRET_KEY, 
        { expiresIn: "30d" }
    );
    return token;
}

module.exports = generateToken