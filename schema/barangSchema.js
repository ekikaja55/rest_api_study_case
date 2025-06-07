const mongoose = require('mongoose')

const BarangSchema = new mongoose.Schema({
    nama_barang: String,
    harga: Number,
}, { timestamps: true })

BarangSchema.pre('save', async function (doc) {
    console.log(`Barang ${doc.nama_barang} berhasil ditambahkan`);
})

module.exports = mongoose.model('Barang', BarangSchema)