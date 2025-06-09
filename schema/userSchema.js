    const mongoose = require('mongoose')
    const bcryptjs = require('bcryptjs')

const UserSchema = new mongoose.Schema({
    email: String,
    username: String,
    password: String,
    role: String,
    access_token: String,
    refresh_token: String
}, { timestamps: true })

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    try {
        this.password = await bcryptjs.hash(this.password, 10)
        next()
    } catch (err) {
        console.error(err);
        next(err)
    }
})


UserSchema.post('save', async function (doc) {
    console.log(`User dengan nama ${doc.username} berhasil disimpan`);
})

module.exports = mongoose.model('User', UserSchema)