const db=require('./../dbconnection')
const config = require('config')
const util = require('./util')
const express = require('express')
const router = express.Router()
const _ = require('lodash')

router.post('/getHandicappersByCriteria', (req, res) => {
  getHandicappersByCriteria(req.body).then(result => {
    res.send(result)
  }).catch(err => {
    res.send(err)
  })
})

router.post('/getStreakByCriteria', (req, res) => {
  getStreakByCriteria(req.body).then(result => {
    res.send(result)
  }).catch(err => {
    res.send(err)
  })
})

router.post('/getGamesByCriteria', (req, res) => {
  getGamesByCriteria(req.body).then(result => {
    res.send(result)
  }).catch(err => {
    res.send(err)
  })
})


const getHandicappersByCriteria = async function(options) {
  /* __________ HANDICAPPER CRITERIA ___________
    {
    	"last": 97,
    	"sport": "NBA",
    	"type": "SPREAD",
    	"spread": {
    		"min": 10,
    		"max": 20
    	},
    	"ou": {
    		"min": 10,
    		"max": 20
    	},
    	"units": 0,
    	"top": {
    		"percentage": 5
    	},
    	"bottom": {
    		"value": 20
    	},
    	"calculation": {
    		"picks": 10,
    		"winp": 30
    	},
    	"streak": {
    		"last": 5,
    		"winp": 20
    	}
    }
  */
  let where = " WHERE "

  if (options['last'] !== undefined)
    where += "historical.date BETWEEN '" + util.getDiffDate(options['last']) + "' AND '" + util.getDiffDate(0) + "'"
  if (options['sport'] !== undefined)
    where += " AND historical.sport='" + options['sport'] + "'"
  if (options['type'] !== undefined && options['type'] !== 'ALL')
    where += " AND historical.type='" + options['type'] + "'"
  if (options['spread'] !== undefined) {
    if (options['spread']['min'] !== undefined && options['spread']['max'] !== undefined) {
      where += " AND historical.hc_spread BETWEEN " + options['spread']['min'] + " AND " + options['spread']['max'] + " AND historical.hc_spread <> 0"
    } else if (options['spread']['min'] !== undefined) {
      where += " AND historical.hc_spread > " + options['spread']['min'] + " AND historical.hc_spread <> 0"
    } else if (options['spread']['max'] !== undefined) {
      where += " AND historical.hc_spread < " + options['spread']['max'] + " AND historical.hc_spread <> 0"
    }
  }
  if (options['ou'] !== undefined) {
    if (options['ou']['min'] !== undefined && options['ou']['max'] !== undefined) {
      where += " AND historical.hc_ou BETWEEN " + options['ou']['min'] + " AND " + options['ou']['max'] + " AND historical.hc_ou <> 0"
    } else if (options['ou']['min'] !== undefined) {
      where += " AND historical.hc_ou > " + options['ou']['min'] + " AND historical.hc_ou <> 0"
    } else if (options['ou']['max'] !== undefined) {
      where += " AND historical.hc_ou < " + options['ou']['max'] + " AND historical.hc_ou <> 0"
    }
  }
  if (options['units'] !== undefined)
    where += " AND historical.units > " + options['units']

  let orderby = " ORDER BY historical.handicapper_id ASC"
  let join = " LEFT JOIN handicappers ON handicappers.id = historical.handicapper_id"

  if (where.startsWith(' AND'))
    where = where.substring(5, where.length)

  let query;
  if (where.length > 7)
    query = "SELECT historical.*, handicappers.name, handicappers.site FROM historical" + join + where + orderby
  else
    query = "SELECT historical.*, handicappers.name, handicappers.site FROM historical" + join + orderby

  let picks = await db.query(query)

  let handicappers = _.chain(picks)
              .groupBy('name')
              .toPairs()
              .map(groupedPicks => {
                return _.fromPairs(_.zip(['handicapper_name', 'picks'], groupedPicks))
              })
              .value()

  handicappers.forEach(handicapper => {
    let win = 0, loss = 0
    handicapper.picks.forEach(pick => {
      if (pick['result'] === 'Win')
        win ++
      else
        loss ++
    })
    handicapper['winp'] = win / parseFloat(win + loss) * 100
    handicapper['site'] = handicapper['picks'][0]['site']
    let groupedPicks = _.chain(handicapper['picks'])
                        .groupBy('date')
                        .toPairs()
                        .map(item => {
                          return _.fromPairs(_.zip(['date', 'picks'], item))
                        })
                        .value()
    groupedPicks.sort(function(a,b){
      return new Date(b.date) - new Date(a.date);
    });
    delete handicapper['picks']
    handicapper['pick'] = groupedPicks
  })
  handicappers = _.sortBy(handicappers, 'winp')
  let topHandicappers = []
  let bottomHandicappers = []

  if (options['top'] !== undefined) {
    if (options['top']['percentage'] !== undefined) {
      let val = handicappers.length * options['top']['percentage'] / 100
      topHandicappers = handicappers.slice(Math.max(handicappers.length - val, 0))
    } else if (options['top']['value'] !== undefined){
      topHandicappers = handicappers.slice(Math.max(handicappers.length - options['top']['value'], 0))
    }
    topHandicappers = _.reverse(topHandicappers)
  }
  if (options['bottom'] !== undefined) {
    if (options['bottom']['percentage'] !== undefined) {
      let val = handicappers.length * options['bottom']['percentage'] / 100
      bottomHandicappers = handicappers.slice(0, Math.min(handicappers.length, val))
    } else if (options['bottom']['value'] !== undefined){
      bottomHandicappers = handicappers.slice(0, Math.min(options['bottom']['value'], handicappers.length))
    }
  }

  return Promise.resolve({
    picks: picks,
    all: handicappers,
    top: topHandicappers,
    bottom: bottomHandicappers
  });
}

const getStreakByCriteria = async function(options) {
  let handicappers = await getHandicappersByCriteria(options)
  handicappers = handicappers['all']

  // /* ____________________ STREAK _____________________ */
  let streakHandicappersAll = []
  if (options['streak'] !== undefined) {
    let streakLast = options['streak']['last']
    let streakWinP = options['streak']['winp']
    handicappers.forEach(handicapper => {
      let pickNum = 0
      let winNum = 0
      let currentDateIndex = 0
      let picks = handicapper['pick']
      do {
        pickNum += picks[currentDateIndex]['picks'].length
        picks[currentDateIndex]['picks'].forEach(p => {
          if (p['result'] === 'Win')
            winNum ++
        })
        currentDateIndex ++
      } while(currentDateIndex <picks.length && pickNum < streakLast)

      // console.log('____________ info _______________')
      // console.log(handicapper['handicapper_name'])
      // console.log('pickNum: ' + pickNum )
      // console.log('winNum: ' + winNum)
      if (pickNum >= streakLast && (winNum / parseFloat(pickNum) * 100) >= streakWinP) //this handicapper is ready to use
        streakHandicappersAll.push(handicapper)
    })
  }

  return Promise.resolve(streakHandicappersAll);
}

const getGamesByCriteria = async function(options) {
  let picks = await getHandicappersByCriteria(options)
  picks = picks['picks']

  /* ______________________ GAME CALCULATION ______________________*/
  let gameCalculation = []
  if (options['calc'] !== undefined) {
    let totalPicks = options['calc']['picks']
    let winp = options['calc']['winp']

    picks.forEach(pick => {
      pick['gameIdentifier'] = pick['home'] + pick['away']
    })

    let groupedGames = _.chain(picks)
                        .groupBy('gameIdentifier')
                        .toPairs()
                        .map(groupedPicks => {
                          return _.fromPairs(_.zip(['gameIdentifier', 'picks'], groupedPicks))
                        })
                        .value()

    groupedGames.forEach(game => {
      delete game['gameIdentifier']
      game['picks'].forEach(pick => {
        delete pick['gameIdentifier']
      })
      game['home'] = game['picks'][0]['home']
      game['away'] = game['picks'][0]['away']
      game['date'] = game['picks'][0]['date']
      game['totalPicks'] = game['picks'].length
      game['totalWinPicks'] = game['picks'].filter(pick => pick['result'] === 'Win').length
    })

    gameCalculation = groupedGames.filter(game => game['totalPicks'] >= totalPicks && ((game['totalWinPicks']/parseFloat(game['totalPicks']))*100) >=winp)

  }

  return Promise.resolve(gameCalculation);
}

module.exports = router
