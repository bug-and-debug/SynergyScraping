const db=require('./../dbconnection')
const si = require('./../sites/si')
const vegasinsider = require('./../sites/vegasinsider')
const cappertek = require('./../sites/cappertek')
const sportsinvestorcentral = require('./../sites/sportsinvestorcentral')
const cappersmonitor = require('./../sites/cappersmonitor')
const documentedhandicappers = require('./../sites/documentedhandicappers')
const sportspicksforum = require('./../sites/sportspicksforum')
const precisionpicks = require('./../sites/precisionpicks')
const nodeCron = require('node-cron')
const stringSimilarity = require('string-similarity')
const config = require('config')

const start = function() {
   setInterval(async function(){
     let date = new Date().toLocaleString('en-US', {
     timeZone: 'America/New_York'
     }).split(',')[0].split('/')

     let today = date[2] + '-' + ("0" + date[0]).slice(-2) + '-' + ("0" + date[1]).slice(-2)
     let today_vi = ("0" + date[0]).slice(-2) + '-' + ("0" + date[1]).slice(-2) + '-' + date[2]
     let today_cappertek = date[0] + '%2F' + date[1] + '%2F' + date[2]
     console.log(today)
     console.log(today_vi)
     console.log(today_cappertek)

     //************************* SI.COM **************************//
     console.log('.............si/nba ...............')
     let games = await si.scrape({platform: 'nba', date: today})
     await updateGames(today, games, 1)

     console.log('............ si/ncaab .............')
     games = await si.scrape({ platform: "college-basketball", date: today})
     await updateGames(today, games, 2)

     //************************* VEGASINSIDER.COM **************************//
     console.log('............ vegasinsider/nba .............')
     games = await vegasinsider.scrape({platform: 'nba', date: today_vi})
     await updateOdds(today, games)

     console.log('............ vegasinsider/ncaab .............')
     games = await vegasinsider.scrape({platform: 'ncaab', date: today_vi})
     await updateOdds(today, games)

     let picks = []

     //************************ CAPPERTEK ********************************//
     console.log('............ cappertek/nba ................')
     picks = await cappertek.scrape({platform: 'nba', date: today_cappertek})
     await updatePicks(today, picks)

     console.log('............ cappertek/ncaab ................')
     picks = await cappertek.scrape({platform: 'ncaab', date: today_cappertek})
     await updatePicks(today, picks)

     //********************** SPORTSINVESTORCENTRAL ***********************//
     console.log('............ sportsinvestorcentral/nba ................')
     picks = await sportsinvestorcentral.scrape({platform: 'nba'})
     await updatePicks(today, picks)

     console.log('............ sportsinvestorcentral/ncaab ................')
     picks = await sportsinvestorcentral.scrape({platform: 'ncaab'})
     await updatePicks(today, picks)

    //********************** CAPPERSMONITOR *****************************//
     console.log('............ cappersmonitor/nba ................')
     picks = await cappersmonitor.scrape({platform: 'nba'})
     await updatePicks(today, picks)

     console.log('............ cappersmonitor/ncaab ................')
     picks = await cappersmonitor.scrape({platform: 'ncaab'})
     await updatePicks(today, picks)

    //************************ DOCUMENTEDHANDICAPPERS ***********************//
     console.log('............ documentedhandicappers/nba ................')
     picks = await documentedhandicappers.scrape({platform: 'nba'})
     await updatePicks(today, picks)

     console.log('............ documentedhandicappers/ncaab ................')
     picks = await documentedhandicappers.scrape({platform: 'ncaab'})
     await updatePicks(today, picks)

     //************************ SPORTSPICKSFORUM ***********************//
      console.log('............ sportspicksforum/nba ................')
      picks = await sportspicksforum.scrape({platform: 'nba'})
      await updatePicks(today, picks)

      console.log('............ sportspicksforum/ncaab ................')
      picks = await sportspicksforum.scrape({platform: 'ncaab'})
      await updatePicks(today, picks)

      //************************ PRECISIONPICKS ***********************//
       console.log('............ precisionpicks/nba ................')
       picks = await precisionpicks.scrape({platform: 'nba'})
       await updatePicks(today, picks)

       console.log('............ precisionpicks/ncaab ................')
       picks = await precisionpicks.scrape({platform: 'ncaab'})
       await updatePicks(today, picks)

   }, config.get('cron.interval'))
}

/*<<<<<<<<<<<<<<<<<<<<<< SI >>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
const updateGames = async function(today, games, type) {
  let query
  for (let game of games) {
    console.log('___________ update a game __________')
     /* home team */
     query = 'SELECT * FROM teams WHERE name="' +  game['home']['name'] + '" AND city="' + game['home']['city'] + '"'
     let home_team =  await db.query(query)
     if (home_team.length < 1) {
       await db.query('INSERT INTO teams SET ?', {name: game['home']['name'], city: game['home']['city'], type: type})
     }

     /* away team */
     query = 'SELECT * FROM teams WHERE name="' +  game['away']['name'] + '" AND city="' + game['away']['city'] + '"'
     let away_team = await db.query(query)
     if (away_team.length < 1){
      await db.query('INSERT INTO teams SET ?', {name: game['away']['name'], city: game['away']['city'], type: type})
    }

    /* match */
    let home = await db.query('SELECT id FROM teams WHERE name="' +  game['home']['name'] + '" AND city="' + game['home']['city'] + '" LIMIT 1')
    let away = await db.query('SELECT id FROM teams WHERE name="' +  game['away']['name'] + '" AND city="' + game['away']['city'] + '" LIMIT 1')

    query = 'SELECT * FROM games WHERE date=? AND home=? AND away=?'
    let match = await db.query(query, [today, home[0]['id'], away[0]['id']])
    if (match.length < 1) { // insert
      await db.query('INSERT INTO games SET ?', {date: today, time: game['time'], type: type,  home: home[0]['id'], home_score: game['home']['total'], away: away[0]['id'], away_score: game['away']['total']})
    } else { //update
      let options = {date: today, home: home[0]['id'], away: away[0]['id']}
      let data = {home_score: game['home']['total'], away_score: game['away']['total']}
      await db.query(createUpdateQuery('games', options, data), Object.values(data).concat(Object.values(options)))
    }
  }
}

const updateOdds = async function(today, games) {
  let query
  for (let game of games) {
    console.log('___________ update an odd __________')
    /* match */
    let home_id = await getTeamFromContext(game['home']['name'])
    let away_id = await getTeamFromContext(game['away']['name'])

    query = 'SELECT * FROM games WHERE date=? AND home=? AND away=?'
    let match = await db.query(query, [today, home_id, away_id])
    if (match.length > 0) { //update odds
      let options = {date: today, home: home_id, away: away_id}
      let data = {home_score: game['home']['total'], away_score: game['away']['total']}
      let query = 'UPDATE games SET ou=?, spread=? WHERE date=? AND home=? AND away=?'
      await db.query(query, [game['ou'], game['spread'], today, home_id, away_id])
    }
  }
}

const updatePicks = async function(today, picks) {
  for (let pick of picks) {
    console.log('__________ update a pick ____________')
    let home_id = await getTeamFromContext(pick['home'])
    let away_id = await getTeamFromContext(pick['away'])
    let spread_id = await getTeamFromContext(pick['h_spread'])
    //console.log(pick['home'] + ' @@ ' + home_id + ' **** ' + pick['away'] + ' @@ ' + away_id)
    let game = await getGame(today, home_id, away_id)

    if (game) { //process pick
      let wl = '--'
      if (pick['type'] === 'OU') {
        if (game['home_score'] === null || game['away_score'] === null || game['ou'] === null || pick['h_ou'] === '') {
          wl = '--'
        } else {
          if (game['home_score'] + game['away_score'] > game['ou']) {
            if (pick['h_ou'] === 'OVER')
              wl = 'WIN'
            else
              wl = 'LOSE'
          } else {
            if (pick['h_ou'] === 'UNDER')
              wl = 'WIN'
            else
              wl = 'LOSE'
          }
        }
      } else if (pick['type'] === 'SPREAD') {
        if (game['home_score'] === null || game['away_score'] === null || game['spread'] === null || pick['h_spread'] === '') {
          wl = '--'
        } else {
          if (game['home_score'] + game['spread'] > game['away_score']) {
            if (game['home'] === spread_id)
              wl = 'WIN'
            else if (game['away'] === spread_id)
              wl = 'LOSE'
            else
              wl = '--'
          } else {
            if (game['away'] === spread_id)
              wl = 'WIN'
            else if (game['home'] === spread_id)
              wl = 'LOSE'
            else
              wl = '--'
          }
        }
      }

      let query = 'SELECT * FROM picks WHERE game_id=? AND site=? AND handicapper=?'
      let items = await db.query(query, [game['id'], pick['site'], pick['handicapper']])
      if (items.length > 0) { // needs update a pick
        let pick_id = items[0]['id']
        query =  'UPDATE picks SET type=?, hc_spread=?, hc_ou=?, h_spread=?, h_ou=?, units=?, price=? WHERE id=?'
        await db.query(query, [pick['type'], pick['hc_spread'], pick['hc_ou'], pick['h_spread'], pick['h_ou'], pick['units'], pick['price'], pick_id])
      } else { // insert a pick
        await db.query('INSERT INTO picks SET ?', {
                                                    game_id: game['id'],
                                                    site: pick['site'],
                                                    handicapper: pick['handicapper'],
                                                    type: pick['type'],
                                                    hc_spread: pick['hc_spread'],
                                                    hc_ou: pick['hc_ou'],
                                                    h_spread: pick['h_spread'],
                                                    h_ou: pick['h_ou'],
                                                    units: pick['units'],
                                                    price: pick['price'],
                                                    wl: wl
                                                  })
      }
    }
  }
}

const getTeamFromContext = async function(context) {
  let teams = await db.query('SELECT * FROM teams')
  let ranks = []
  teams.forEach(team => {
    let rank_name = stringSimilarity.compareTwoStrings(team['name'], context)
    let rank_city = stringSimilarity.compareTwoStrings(team['city'], context)
    let rank_both = stringSimilarity.compareTwoStrings(team['name'] + ' ' + team['city'], context)
    let rank_both_inv = stringSimilarity.compareTwoStrings(team['city'] + ' ' + team['name'], context)
    ranks.push({id: team['id'], rank: rank_name})
    ranks.push({id: team['id'], rank: rank_city})
    ranks.push({id: team['id'], rank: rank_both})
    ranks.push({id: team['id'], rank: rank_both_inv})
  })

  let team_id = 0
  let v_rank = 0
  ranks.forEach(rank => {
    if (parseFloat(rank['rank']) > v_rank) {
      v_rank = parseFloat(rank['rank'])
      team_id = rank['id']
    }
  })
  return team_id
}

const getGame = async function(date, home_id, away_id) {
  let query = 'SELECT * FROM games WHERE date=? AND home=? AND away=? LIMIT 1'
  let game = await db.query(query, [date, home_id, away_id])
  if (game.length == 0) {
    return null
  } else {
    return game[0]
  }
}

const createUpdateQuery = function(table, options, data) {
  let dataKeys = Object.keys(data)
  let dataValues = Object.values(data)

  let query = 'UPDATE ' + table + ' SET '
  dataKeys.forEach(key => {
    query = query + key + '=?, '
  })
  query = query.substring(0, query.length-2) + ' WHERE '

  let optionKeys = Object.keys(options)
  let optionValues = Object.values(options)

  optionKeys.forEach(key => {
    query = query + key + '=? AND '
  })
  query = query.substring(0, query.length-4)

  return query
}

module.exports = {
  start
}
