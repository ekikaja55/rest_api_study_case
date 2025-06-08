const mongoose = require('mongoose')

const BarangSchema = new mongoose.Schema({
    nama_barang: {
        type: String,

    },
    harga: Number,
}, { timestamps: true })

BarangSchema.pre('save', async function (next) {
    this.nama_barang = this.nama_barang.toLowerCase()
    console.log(`Barang ${this.nama_barang} berhasil ditambahkan`);
    next()
})

module.exports = mongoose.model('Barang', BarangSchema)