// models/Form.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  questionType: { 
    type: String, 
    enum: ['text', 'textarea', 'radio', 'checkbox', 'dropdown', 'email', 'number', 'date'],
    required: true 
  },
  options: [String], // For radio, checkbox, dropdown
  required: { type: Boolean, default: false },
  order: { type: Number, required: true }
});

const formSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  questions: [questionSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Form', formSchema);

