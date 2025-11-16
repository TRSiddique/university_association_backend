// models/Response.js
const responseSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: mongoose.Schema.Types.Mixed // Can be string, array, number, etc.
  }],
  submittedAt: { type: Date, default: Date.now },
  ipAddress: String
});

module.exports = mongoose.model('Response', responseSchema);