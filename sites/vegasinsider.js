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
      nba: {
        matches: {
          listItem: ".sportPicksBorder",
          data: {
            time: ".sportPicksTitleBorder > td:nth-child(2) > .sub_title_red",
            away: "tr:nth-child(1) > td:nth-child(2) > b > a:nth-child(1)",
            home: "tr:nth-child(1) > td:nth-child(2) > b > a:nth-child(2)",
            away_score: {
              listItem: "tr:nth-child(4) > td.sportPicksBorderL2"
            },
            home_score: {
              listItem: "tr:nth-child(5) > td.sportPicksBorderL"
            }
          }
        }
      },
      ncaab: {
        matches: {
          listItem: "td[width='49%']",
          data: {
            time: ".sportPicksBorder > tr:nth-child(1) > .sub_title_red",
            away: ".table_title > .yeallowBg2 > a:nth-child(1)",
            home: ".table_title > .yeallowBg2 > a:nth-child(2)",
            away_score: {
              listItem: ".sportPicksBorder > tr:nth-child(3) > .sportPicksBorderL2"
            },
            home_score: {
              listItem: ".sportPicksBorder > tr:nth-child(4) > .sportPicksBorderL2"
            }
          }
        }
      }
    },
    LEVEL2: {
        home_name: {
          selector: "td[width='47%'] > table > tr > td > font > a",
          eq: 0
        },
        home_score: {
          selector: "td[width='47%'] > table > tr > td > font > b",
          eq: 0,
          convert: x => x.slice(1, x.length-1)
        },
        hc_spread: {
          selector: "td[width='17%'] > div > font",
          eq: 0,
          convert: x => x.split(' ')[0]
        },
        hc_ou: {
          selector: "tr:nth-child(1) > td[width='18%']:nth-child(4) > div > font",
          convert: x => x.split(' ')[1]
        },
        away_name: {
          selector: "td[width='47%'] > table > tr > td > font > a",
          eq: 1
        },
        away_score: {
          selector: "td[width='47%'] > table > tr > td > font > b",
          eq: 1,
          convert: x => x.slice(1, x.length-1)
        },
        picks: {
          listItem: "table[width=969] > tr > td > table[cellpadding=0]:nth-child(3) > tr > td > table[cellpadding=8] > tr",
          data: {
            handicapper: {
              selector: "td > div:nth-child(1) > a > b > font"
            },
            price: {
              selector: "td > div:nth-child(3) > table > tr > td:nth-child(2) > b:last-child > font > a > font",
              convert: x => {
                if (x.split('$').length > 1)
                  return x.split('$')[1]
                else
                  return x
              }
            },
            type: {
              selector: "td:nth-child(2) > table > tr > td > table > tr:nth-child(2) > td > font > b",
              convert: x => {
                if (x.indexOf('PICK') > -1) {
                  if (x.split(':')[1].startsWith(' OVER') || x.split(':')[1].startsWith(' UNDER')) {
                    return 'OU'
                  } else {
                    return 'SPREAD'
                  }
                }
                return ''
              }
            },
            h_spread: {
              selector: "td:nth-child(2) > table > tr > td > table > tr:nth-child(2) > td > font > b",
              convert: x => {
                if (x.indexOf('PICK') > -1) {
                  if (!x.split(':')[1].startsWith(' OVER') && !x.split(':')[1].startsWith(' UNDER')) {
                    let ids = []
                    if (x.split(':')[1].indexOf('+') > 0)
                      ids.push(x.split(':')[1].indexOf('+'))
                    if (x.split(':')[1].indexOf('-') > 0)
                      ids.push(x.split(':')[1].indexOf('-'))
                    if (x.split(':')[1].indexOf('(') > 0)
                      ids.push(x.split(':')[1].indexOf('('))
                    let idx = Math.min(...ids)
                    if (idx > 0)
                      return x.split(':')[1].slice(1, idx-1)
                    else
                      return x.split(':')[1]
                  }
                }
                return ''
              }
            },
            h_ou: {
              selector: "td:nth-child(2) > table > tr > td > table > tr:nth-child(2) > td > font > b",
              convert: x => {
                if (x.indexOf('PICK') > -1) {
                  if (x.split(':')[1].startsWith(' OVER')) {
                    return 'OVER'
                  } else if (x.split(':')[1].startsWith(' UNDER')) {
                    return 'UNDER'
                  }
                }
                return ''
              }
            },
            unit: {
              selector: "td:nth-child(2) > table > tr > td > table > tr:nth-child(2) > td > font",
              convert: x => {
                if (x.endsWith('UNITS')) {
                  return x.split(':').pop().split(' ')[1]
                } else {
                  return ''
                }
              }
            }
          }
        }
    }
  }

class VegasInsider {
    static scrape(options) {
      let platform = options['platform']
      let date = options['date']
      let base_url = 'https://www.cappertek.com/'
      let url
      if (platform == 'ncaab')
        url = 'http://www.vegasinsider.com/college-basketball/scoreboard/scores.cfm/game_date/' + date
      else
        url = 'http://www.vegasinsider.com/nba/scoreboard/scores.cfm/game_date/' + date
      const useragent = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.0.3705; .NET CLR 1.1.4322)'

      return scrapeIt({url: url, headers: { "User-agent": useragent }}, OPTIONS['LEVEL1'][platform]).then(({ data, response }) => {
        let result = []
        let matches = data['matches']
        matches.forEach(match => {
          let ou = parseFloat(match['home_score'][1])
          let spread = parseFloat(match['home_score'][1])
          if (ou < parseFloat(match['away_score'][1])) {
            ou = parseFloat(match['away_score'][1])
          } else {
            spread = parseFloat(match['away_score'][1]) * -1
          }

          if (isNaN(ou))
            ou = 0
          if (isNaN(spread))
            spread = 0

          if (match['time'].endsWith('Game Time')) { //game is not started yet
            result.push({
              status: 'future',
              time: match['time'].slice(0, -10),
              ou: ou,
              spread: spread,
              home: {
                name: match['home']
              },
              away: {
                name: match['away']
              }
            })
          } else { // finished or in-progress
            result.push({
              status: 'finished',
              ou: ou,
              spread: spread,
              home: {
                name: match['home'],
                total: match['home_score'][match['home_score'].length-1]
              },
              away: {
                name: match['away'],
                total: match['away_score'][match['away_score'].length-1]
              }
            })
          }
        })
        return Promise.resolve(result)
      })
    }
}

module.exports=VegasInsider;
