const express = require("express");
const router = express.Router();
const trafficController = require("../controllers/traffic.controller");

// Create or update traffic authority
router.post("/authority", trafficController.createOrUpdate);

// Get all traffic authorities
router.get("/authorities", trafficController.getAll);

// Delete traffic authority (soft delete - deactivate)
router.delete("/authority/:id", trafficController.delete);

module.exports = router;
