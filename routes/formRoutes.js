// routes/formRoutes.js
const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const Response = require('../models/Response');

// Admin Routes

// Create a new form
router.post('/admin/forms', async (req, res) => {
  try {
    const form = new Form(req.body);
    await form.save();
    res.status(201).json(form);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all forms (admin)
router.get('/admin/forms', async (req, res) => {
  try {
    const forms = await Form.find().sort({ createdAt: -1 });
    res.json(forms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single form (admin)
router.get('/admin/forms/:id', async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update form
router.put('/admin/forms/:id', async (req, res) => {
  try {
    const form = await Form.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json(form);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete form
router.delete('/admin/forms/:id', async (req, res) => {
  try {
    const form = await Form.findByIdAndDelete(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get responses for a form
router.get('/admin/forms/:id/responses', async (req, res) => {
  try {
    const responses = await Response.find({ formId: req.params.id })
      .sort({ submittedAt: -1 });
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public Routes

// Get active form by ID (public)
router.get('/public/forms/:id', async (req, res) => {
  try {
    const form = await Form.findOne({ _id: req.params.id, isActive: true });
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit form response
router.post('/public/forms/:id/submit', async (req, res) => {
  try {
    const form = await Form.findOne({ _id: req.params.id, isActive: true });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const response = new Response({
      formId: req.params.id,
      answers: req.body.answers,
      ipAddress: req.ip
    });
    
    await response.save();
    res.status(201).json({ message: 'Response submitted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;