const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // user requested to see plain text passwords
  chatId: { type: String }, 
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  demographics: {
    age: { type: Number },
    gender: { type: String },
    location: { type: String },
    interests: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
