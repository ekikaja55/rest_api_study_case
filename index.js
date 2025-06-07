require('dotenv').config()
const port = process.env.PORT
const express = require('express')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const { User, Barang } = require('./schema')
const ms = require('ms')
const authVerify = require('./middleware/authVerify')

const connect = async () => {
    await mongoose.connect(`mongodb://${process.env.MONGO_URL}`)
        .then(() => {
            console.log("konek yeay");
        }).catch((err) => {
            console.error(err);
        })
}

const authRoutes = () => {
    app.post("/api/register", async (req, res) => {
        const { email, username, password, role } = req.body
        try {
            const cariuser = await User.findOne({ email: email })
            if (cariuser) {
                return res.status(404).json({ message: `email sudah terdaftar` })
            }
            const userBaru = new User({ email, username, password, role })
            await userBaru.save()
            return res.status(200).json({ message: "berhasil registrasi" })

        } catch (error) {
            return res.status(500).json({ message: "server error" })
        }

    })
    app.post("/api/login", async (req, res) => {
        const { email, password } = req.body
        try {
            const user = await User.findOne({ email: email }).select('_id email username password role')

            if (!user || !(await bcryptjs.compare(password, user.password))) {
                return res.status(401).json({ message: 'Email atau password salah' });
            }

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

            res.cookie("access_token", access_token, {
                httpOnly: true,
                maxAge: ms("1h")
            })
            res.cookie("refresh_token", refresh_token, {
                httpOnly: true,
                maxAge: ms("2h")
            })

            return res.status(200).json({
                message: "Berhasil Login",
                access_token,
                refresh_token
            })

        } catch (error) {
            return res.status(500).json({ message: "server error" })
        }

    })

    app.post("/api/logout", async (req, res) => {
        const token = req.cookies.refresh_token
        if (!token) return res.status(204).json({ message: "token tidak ada atau sudah logout" })

        try {
            const user = await User.findOne({ refresh_token: token })
            if (!user) return res.status(404).json({ message: "user tidak ditemukan" })

            user.refresh_token = null
            user.access_token = null

            await user.save()

            res.clearCookie("refresh_token", {
                httpOnly: true
            })
            res.clearCookie("access_token", {
                httpOnly: true
            })

            return res.status(200).json({ message: "Berhasil Logout" })

        } catch (error) {
            return res.status(500).json({ message: "server error" })
        }
    })

    app.get("/api/refresh_token", async (req, res) => {
        const token = req.cookies.refresh_token
        console.log(token);

        if (!token) return res.status(404).json({ message: "Token Tidak Ada" })
        try {
            const user = await User.findOne({ refresh_token: token }).select("_id email username")

            if (!user || !(await jwt.verify(token, process.env.SECRET_REFRESH_TOKEN))) return res.status(404).json({ message: "Token User Tidak Valid" })

            const newAccessToken = jwt.sign(user.toObject(), process.env.SECRET_ACCESS_TOKEN, {
                expiresIn: ms("1h")
            })

            user.access_token = newAccessToken
            await user.save()

            req.cookies.access_token = newAccessToken
            return res.status(200).json({ message: "Berhasil Refresh Token" })
        } catch (error) {
            return res.status(500).json(error)
        }

    })

    app.get("/api/dashboard", [authVerify], (req, res) => {
        return res.status(200).json(req.user)
    })
}

const masterBarangRoutes = () => {
    app.get("/api/barang", async (req, res) => {
        try {
            const result = await Barang.find().select("-__v")
            return res.status(200).json(result)
        } catch (error) {
            return res.status(500).json({ message: "Server Error" })
        }
    })
    app.post("/api/barang", async (req, res) => {
        const { nama_barang, harga } = req.body

        try {
            const cariBarang = await Barang.findOne({ nama_barang: nama_barang })

            if (cariBarang) return res.status(404).json({ message: `Barang ${nama_barang} sudah terdaftar` })

            const barangBaru = new Barang({ nama_barang, harga: Number(harga) })
            await barangBaru.save()

            return res.status(200).json({ message: `Berhasil Tambah Barang ${nama_barang}` })
        } catch (error) {
            return res.status(500).json({ message: "Server Error" })
        }
    })
    app.put("/api/barang/:id",async(req,res) => {
        
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
    masterBarangRoutes()
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

