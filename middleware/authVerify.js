require("dotenv").config()
const jwt = require('jsonwebtoken')

const authVerify = async (req, res, next) => {
    console.log("masuk middleware");
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer")) return res.status(401).json({ message: "Token Tidak Ditemukan" })

    const token = authHeader.split(" ")[1]

    try {
        const decoded = await jwt.verify(token, process.env.SECRET_ACCESS_TOKEN)
        req.user = decoded
        next()

    } catch (error) {
        return res.status(400).json({message:"Token Tidak Valid"})
    }

}

module.exports = authVerify