const db=require('./../dbconnection')
const sportsinvestorcentral = require('./../sites/sportsinvestorcentral')
const precisionpicks = require('./../sites/precisionpicks')
const stringSimilarity = require('string-similarity')
const config = require('config')
const util = require('./util')

console.log('historical update ....')
util.truncateTable('historical').then(async result => {
  console.log(result)
  //********************* PRECISIONPICKS *******************//
  console.log('.............. precisionpicks.com / nba .................')
  let handicappers = await precisionpicks.historical({platform: 'nba'})
  await updateHandicapperPicks(handicappers, 'precisionpicks.com')
  console.log('.............. precisionpicks.com / ncaab .................')
  handicappers = await precisionpicks.historical({platform: 'ncaab'})
  await updateHandicapperPicks(handicappers, 'precisionpicks.com')

  //********************* SPORTSINVESTORCENTRAL *******************//
  console.log('.............. sportsinvestorcentral.com / nba ...........')
  handicappers = await sportsinvestorcentral.historical({platform: 'nba'})
  await updateHandicapperPicks(handicappers, 'sportsinvestorcentral.com')
  console.log('.............. sportsinvestorcentral.com / ncaab ...........')
  handicappers = await sportsinvestorcentral.historical({platform: 'ncaab'})
  await updateHandicapperPicks(handicappers, 'sportsinvestorcentral.com')

  process.exit(0)
}).catch(err => {
  console.log(err)
  process.exit(0)
})

const updateHandicapperPicks = async function(handicapper_data, site) {
  for (let handicapper of handicapper_data) {
    console.log(handicapper['name'])
    let name = handicapper['name']

    let query = 'SELECT * FROM handicappers WHERE name=? AND site=?'
    let handicapper_info =  await db.query(query, [name, site])
    let handicapper_id = -1
    if (handicapper_info.length < 1) {
      let result = await db.query('INSERT INTO handicappers SET ?', {name: name, site: site})
      handicapper_id = result.insertId
    } else {
      handicapper_id = handicapper_info[0]['id']
    }

    for (let record of handicapper['records']) {
      console.log('inserting > > > >')
      await db.query('INSERT INTO historical SET ?', Object.assign(record, {handicapper_id: handicapper_id}))
    }
  }
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
    let away_id = await await getTeamFromContext(game['away']['name'])

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
    let game_id = await getGame(today, home_id, away_id)
    if (game_id > 0) { //process pick
      let query = 'SELECT * FROM picks WHERE game_id=? AND site=? AND handicapper=?'
      let items = await db.query(query, [game_id, pick['site'], pick['handicapper']])
      if (items.length > 0) { // needs update a pick
        let pick_id = items[0]['id']
        query =  'UPDATE picks SET type=?, hc_spread=?, hc_ou=?, h_spread=?, h_ou=?, units=?, price=? WHERE id=?'
        await db.query(query, [pick['type'], pick['hc_spread'], pick['hc_ou'], pick['h_spread'], pick['h_ou'], pick['units'], pick['price'], pick_id])
      } else { // insert a pick
        await db.query('INSERT INTO picks SET ?', {game_id: game_id, site: pick['site'], handicapper: pick['handicapper'], type: pick['type'], hc_spread: pick['hc_spread'], hc_ou: pick['hc_ou'], h_spread: pick['h_spread'], h_ou: pick['h_ou'], units: pick['units'], price: pick['price']})
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
    ranks.push({id: team['id'], rank: rank_name})
    ranks.push({id: team['id'], rank: rank_city})
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
    return -1
  } else {
    return game[0]['id']
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
