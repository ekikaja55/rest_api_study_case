require('dotenv').config()
const port = process.env.PORT
const express = require('express')
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs')
const { User, Barang, Transaksi } = require('./schema')
const ms = require('ms')
const authVerify = require('./middleware/authVerify')
const cekRole = require('./middleware/cekRole')

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
        const { email, username, password } = req.body
        try {
            const cariuser = await User.findOne({ email: email })
            if (cariuser) {
                return res.status(404).json({ message: `email sudah terdaftar` })
            }
            const userBaru = new User({ email, username, password, role: "member" })
            await userBaru.save()
            return res.status(200).json({ message: "berhasil registrasi" })

        } catch (error) {
            return res.status(500).json({ message: error.message })

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
            return res.status(500).json({ message: error.message })

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
            return res.status(500).json({ message: error.message })

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
            return res.status(500).json({ message: error.message })

        }

    })

    app.get("/api/dashboard", [authVerify], (req, res) => {
        return res.status(200).json(req.user)
    })
}

const masterBarangRoutes = () => {
    app.get("/api/barang", [authVerify, cekRole], async (req, res) => {
        try {
            const result = await Barang.find().select("-__v").sort({ createdAt: -1 })
            return res.status(200).json(result)
        } catch (error) {
            return res.status(500).json({ message: error.message })

        }
    })
    app.post("/api/barang", [authVerify, cekRole], async (req, res) => {
        const { nama_barang, harga } = req.body

        try {
            const cariBarang = await Barang.findOne({ nama_barang: nama_barang.toLowerCase() })
            if (cariBarang) return res.status(404).json({ message: `Barang ${nama_barang} sudah terdaftar` })

            const barangBaru = new Barang({ nama_barang, harga: Number(harga) })
            await barangBaru.save()

            return res.status(200).json({ message: `Berhasil Tambah Barang ${nama_barang}` })
        } catch (error) {
            return res.status(500).json({ message: error.message })

        }
    })
    app.put("/api/barang/:id", [authVerify, cekRole], async (req, res) => {
        const { id } = req.params
        const { nama_barang, harga } = req.body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID tidak valid" })
        }

        try {
            const cariBarang = await Barang.findById(id)
            if (!cariBarang) {
                return res.status(404).json({ message: `Barang id: ${id} tidak ditemukan` })
            }

            const cekValidNama = await Barang.findOne({
                nama_barang: nama_barang,
                _id: { $ne: id }
            })

            if (cekValidNama) {
                return res.status(400).json({ message: `Barang ${nama_barang} sudah terdaftar, silakan pakai nama lain.` })
            }

            cariBarang.nama_barang = nama_barang
            cariBarang.harga = Number(harga)
            await cariBarang.save()

            return res.status(200).json({ message: `Berhasil update barang ${cariBarang.nama_barang}` })
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }
    })

    app.delete("/api/barang/:id", [authVerify, cekRole], async (req, res) => {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID tidak valid" })
        }
        try {
            const cariBarang = await Barang.findById(id)
            if (!cariBarang) return res.status(404).json({ message: `Barang id: ${id} tidak ditemukan` })
            await cariBarang.deleteOne()
            return res.status(200).json({ message: `Barang dengan id: ${id} berhasil dihapus` })
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }
    })
}


const masterUserRoutes = () => {
    app.get("/api/user", [authVerify, cekRole], async (req, res) => {
        try {
            const result = await User.find().sort({ createdAt: -1 })
            return res.status(200).json(result)
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    })
    app.post("/api/user", [authVerify, cekRole], async (req, res) => {
        const { email, username, password, role } = req.body
        try {
            const cariUser = await User.findOne({ email: email })
            console.log(cariUser);
            if (cariUser) return res.status(404).json({ message: `Email : ${email} sudah terdaftar` })
            const userBaru = new User({ email, username, password, role })
            await userBaru.save()
            return res.status(200).json({ message: `Berhasil Register User : ${username}` })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    })
    app.delete("/api/user/:id", [authVerify, cekRole], async (req, res) => {
        const { id } = req.params
        try {
            const cariUser = await User.findById(id)
            if (!cariUser) return res.status(404).json({ message: `Id : ${id} tidak ditemukan ` })
            await cariUser.deleteOne()
            return res.status(200).json({ message: `User id: ${id} berhasil di hapus` })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    })
    app.put("/api/user/:id", [authVerify, cekRole], async (req, res) => {
        const { id } = req.params
        const { username, password, email, role } = req.body
        try {
            const cariUser = await User.findById(id)
            if (!cariUser) return res.status(404).json({ message: `Id : ${id} tidak ditemukan ` })
            const cekValidNama = await User.findOne({
                email: email,
                _id: { $ne: id }
            })
            if (cekValidNama) {
                return res.status(400).json({ message: `Email ${email} sudah terdaftar, silakan pakai email lain.` })
            }
            cariUser.username = username
            cariUser.password = password
            cariUser.email = email
            cariUser.role = role
            await cariUser.save()
            return res.status(200).json({ message: `User id: ${id} berhasil di update` })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
        }
    })
}

const masterTransactionRoutes = () => {
    app.post("/api/transaction", [authVerify], async (req, res) => {
        const { detail } = req.body
        const user = req.user
        console.log(req.user);
        console.log(detail);
        try {
            const transaksiBaru = new Transaksi({ email: user.email, username: user.username, detail })
            await transaksiBaru.save()
            return res.status(200).json({ message: `Berhasil Melakukan Pembayaran Id transaksi : ${transaksiBaru._id} ` })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error })
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
    masterBarangRoutes()
    masterUserRoutes()
    masterTransactionRoutes()
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

