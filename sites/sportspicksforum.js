const db=require('./../dbconnection')
const scrapeIt = require("scrape-it")
const scraperjs = require('scraperjs')
const cheerio = require('cheerio')
const request = require('request')
const curl = require('curlrequest');
const tableScraper = require('table-scraper')
const _ = require('lodash')

const OPTIONS = {
    LEVEL1: {
      handicappers: {
        listItem: "#content > table > tr",
        data: {
          name: "td:nth-child(1).t-t > a",
          units: "td:nth-child(2).t-t",
          win: "td:nth-child(3).t-t",
          lose: "td:nth-child(4).t-t",
          p: "td:nth-child(5).t-t",
          picks_prices: {
            listItem: ".t-tr > span"
          },
          picks_teams: {
            listItem: ".t-tr > strong > a"
          },
          picks_times: {
            listItem: ".t-tr > em"
          }
        }
      }
    },
    LEVEL2: {
        team1_name: {
          selector: "td[width='47%'] > table > tr > td > font > a",
          eq: 0
        },
        team1_score: {
          selector: "td[width='47%'] > table > tr > td > font > b",
          eq: 0
        },
        team1_moneyline: {
          selector: "tr:nth-child(1) > td[width='18%']:nth-child(2) > div > font"
        },
        team1_spread: {
          selector: "td[width='17%'] > div > font",
          eq: 0
        },
        team1_total: {
          selector: "tr:nth-child(1) > td[width='18%']:nth-child(4) > div > font"
        },
        team2_name: {
          selector: "td[width='47%'] > table > tr > td > font > a",
          eq: 1
        },
        team2_score: {
          selector: "td[width='47%'] > table > tr > td > font > b",
          eq: 1
        },
        team2_moneyline: {
          selector: "tr:nth-child(2) > td[width='18%']:nth-child(2) > div > font"
        },
        team2_spread: {
          selector: "td[width='17%'] > div > font",
          eq: 1
        },
        team2_total: {
          selector: "tr:nth-child(2) > td[width='18%']:nth-child(4) > div > font"
        }
        ,
        picks: {
          listItem: "table[width=969] > tr > td > table[cellpadding=0]:nth-child(3) > tr > td > table[cellpadding=8] > tr",
          data: {
            provider: {
              selector: "td > div:nth-child(1) > a > b > font"
            }
          }
        }
    }
  }

class SportsPicksForum {
    static scrape(options) {
      let base_url = 'https://www.sportspicksforum.com'
      let url = 'https://www.sportspicksforum.com/buy-picks.php'

      return scrapeIt(url, OPTIONS['LEVEL1']).then(({ data, response }) => {
        data['handicappers'] = data['handicappers'].slice(1)
        data['handicappers'].forEach(handicapper => {
          _.remove(handicapper['picks_prices'], (item, index) => index % 2 == 1)
        })

        data['handicappers'].forEach(handicapper => {
          handicapper['picks'] = _.zip(handicapper['picks_teams'], handicapper['picks_prices'], handicapper['picks_times'])
          delete handicapper.picks_teams
          delete handicapper.picks_prices
          delete handicapper.picks_times
        })

        return Promise.resolve(data)
      })
      // .then(result => {
      //   let data = result.map(r => {
      //     let picks = []
      //     r['data']['picks'].forEach(pick => {
      //       if (pick['provider'] != '')
      //         picks.push(pick)
      //     })
      //     r['data']['picks'] = picks
      //     return r['data']
      //   })
      //   return Promise.resolve(result.map(r => r['data']))
      // })
    }
}

module.exports=SportsPicksForum;
