const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
    email: String,
    username: String,
    total: {
        type: Number,
        default: 0,
        min: 0
    },
    detail: [{
        _id: false,
        nama_barang: String,
        sub_total: Number
    }]
}, { timestamps: true })

transactionSchema.pre('save', async function (next) {
    this.total = this.detail.reduce((acc, item) => acc + item.sub_total, 0)
    next()
})


module.exports = mongoose.model('Transaction', transactionSchema)