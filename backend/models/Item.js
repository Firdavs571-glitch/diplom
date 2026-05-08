const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String }, // e.g., 'IT Kurs', 'Kitob', 'Sayohat'
  targetDemographics: {
    minAge: { type: Number, default: 0 },
    maxAge: { type: Number, default: 100 },
    genders: [{ type: String }], // 'Erkak', 'Ayol', 'Barchasi'
    locations: [{ type: String }],
    interests: [{ type: String }]
  },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);
