const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { processDelivery, processQA, processCommitmentStatusDist } = require('../services/excelReader');

const router = express.Router();

router.get('/delivery', requireAuth, (req, res) => {
  try {
    const overrides = req.query.deliveryPath ? { deliveryPath: req.query.deliveryPath } : {};
    res.json(processDelivery(overrides));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/qa', requireAuth, (req, res) => {
  try {
    const overrides = {};
    if (req.query.bugsPath)     overrides.bugsPath     = req.query.bugsPath;
    if (req.query.escapingPath) overrides.escapingPath = req.query.escapingPath;
    res.json(processQA(overrides));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/delivery/status-dist', requireAuth, (req, res) => {
  try {
    const overrides = req.query.deliveryPath ? { deliveryPath: req.query.deliveryPath } : {};
    res.json(processCommitmentStatusDist(overrides));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
