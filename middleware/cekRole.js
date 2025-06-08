require("dotenv").config()
const jwt = require('jsonwebtoken')

const cekRole = async (req, res, next) => {
    console.log("masuk middleware cekrole");
    const user = req.user
    if (user.role === 'member') return res.sendStatus(403)
    console.log(user);
    next()
}

module.exports = cekRole