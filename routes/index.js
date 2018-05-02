const express = require('express')
const si = require('./../sites/si')
const cappersmonitor = require('./../sites/cappersmonitor')
const documentedhandicappers = require('./../sites/documentedhandicappers')
const sportsinvestorcentral = require('./../sites/sportsinvestorcentral')
const cappertek = require('./../sites/cappertek')
const sportspicksforum = require('./../sites/sportspicksforum')
const precisionpicks = require('./../sites/precisionpicks')
const vegasinsider = require('./../sites/vegasinsider')
const test = require('./../sites/test')
const analysis = require('./../manager/analysis')

var router = express.Router();

router.post('/si', function(req, res) {
  si.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/cappersmonitor', function(req, res) {
  cappersmonitor.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/documentedhandicappers', function(req, res) {
  documentedhandicappers.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/sportsinvestorcentral', function(req, res) {
  sportsinvestorcentral.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/h-sportsinvestorcentral', function(req, res) {
  sportsinvestorcentral.historical(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/cappertek', function(req, res) {
  cappertek.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/sportspicksforum', function(req, res) {
  sportspicksforum.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/precisionpicks', function(req, res) {
  precisionpicks.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/h-precisionpicks', function(req, res) {
  precisionpicks.historical(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/vegasinsider', function(req, res) {
  vegasinsider.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.post('/test', function(req, res) {
  test.scrape(req.body).then(function(result) {
    res.send(result);
  }).catch(function(err) {
    res.send(err)
  })
});

router.use('/analysis', analysis)

module.exports = router;
