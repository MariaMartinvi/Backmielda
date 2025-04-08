// routes/storyRoutes.js
const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');

// Generate a new story
router.post('/generate', storyController.generateStory);

// Get a previously generated story by ID (if you implement story saving)
router.get('/:id', storyController.getStoryById);

module.exports = router;