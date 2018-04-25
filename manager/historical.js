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
  console.log('.............. precisionpicks.com / nfl .................')
  handicappers = await precisionpicks.historical({platform: 'nfl'})
  await updateHandicapperPicks(handicappers, 'precisionpicks.com')
  console.log('.............. precisionpicks.com / ncaaf .................')
  handicappers = await precisionpicks.historical({platform: 'ncaaf'})
  await updateHandicapperPicks(handicappers, 'precisionpicks.com')

  //********************* SPORTSINVESTORCENTRAL *******************//
  console.log('.............. sportsinvestorcentral.com / nba ...........')
  handicappers = await sportsinvestorcentral.historical({platform: 'nba'})
  await updateHandicapperPicks(handicappers, 'sportsinvestorcentral.com')
  console.log('.............. sportsinvestorcentral.com / ncaab ...........')
  handicappers = await sportsinvestorcentral.historical({platform: 'ncaab'})
  await updateHandicapperPicks(handicappers, 'sportsinvestorcentral.com')
  console.log('.............. sportsinvestorcentral.com / nfl ...........')
  handicappers = await sportsinvestorcentral.historical({platform: 'nfl'})
  await updateHandicapperPicks(handicappers, 'sportsinvestorcentral.com')
  console.log('.............. sportsinvestorcentral.com / ncaaf ...........')
  handicappers = await sportsinvestorcentral.historical({platform: 'ncaaf'})
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
