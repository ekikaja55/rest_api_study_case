require('dotenv').config()
const port = process.env.PORT
const express = require('express')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const { User } = require('./schema')

const connect = async () => {
    await mongoose.connect(`mongodb:${process.env.MONGO_URL}`)
        .then(() => {
            console.log("konek yeay");
        }).catch((err) => {
            console.error(err);
        })
}

const authRoutes = () => {
    app.post("/api/register", async (req, res) => {
        const { email, username, password } = req.body
        try {
            const cariuser = await User.findOne({ email: email })
            if (cariuser) {
                return res.status(404).json({ message: `email sudah terdaftar` })
            }
            const userBaru = new User({ email, username, password })
            await userBaru.save()
            return res.status(200).json({ message: "berhasil registrasi" })

        } catch (error) {
            return res.status(500).json(error)
        }

    })
    app.post("/api/login", async (req, res) => {
        const { email, password } = req.body
        try {
            const user = await User.findOne({ email: email }).select('_id email username password')
            if (!user) return res.status(404).json({ message: `email atau password salah` })
            const cek = await bcryptjs.compare(password, user.password)
            if (!cek) return res.status(404).json({ message: `email atau password salah` })

            //ini convert mongoose object biar jadi js object murni
            const payload = user.toObject()
            //biar aku bisa ngelakuin delete field, aku ngerasa undifined kurang pas
            delete payload.password

            const access_token = jwt.sign(payload, process.env.SECRET_ACCESS_TOKEN, {
                expiresIn: "1h"
            })
            const refresh_token = jwt.sign(payload, process.env.SECRET_REFRESH_TOKEN, {
                expiresIn: "1h"
            })

            user.access_token = access_token
            user.refresh_token = refresh_token
            await user.save()

            return res.status(200).json("TESTTTTT login")
        } catch (error) {
            return res.status(500).json(error)
        }

    })
}

const main = async () => {
    app.use(express.urlencoded({ extended: true }))
    app.use(cookieParser())
    app.use(express.json())
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true
    }))
    await connect()
    authRoutes()
    app.listen(port, () => {
        console.log("berhasil run yeay");

    })
}


//excecute 
try {
    main()
} catch (error) {
    console.log(error);
}

