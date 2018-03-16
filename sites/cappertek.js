const db=require('./../dbconnection')
const scrapeIt = require("scrape-it")
const scraperjs = require('scraperjs')
const cheerio = require('cheerio')
const request = require('request')
const curl = require('curlrequest');
const tableScraper = require('table-scraper')
const _ = require('lodash')
const util = require('./../manager/util')

const OPTIONS = {
    LEVEL1: {
      nba: {
        listItem: "table[cellpadding=12]",
        data: {
          pick: {
            selector: "a[href^='todaysPicks.asp?d=nba-basketball']",
            attr: "href"
          }
        }
      },
      ncaab: {
        listItem: "table[cellpadding=12]",
        data: {
          pick: {
            selector: "a[href^='todaysPicks.asp?d=ncaab-college-basketball']",
            attr: "href"
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
          eq: 1,
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
            units: {
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

class Cappertek {
    static scrape(options) {
      let platform = options['platform']
      let date = options['date']
      let base_url = 'https://www.cappertek.com/'
      let url = 'https://www.cappertek.com/accessPicks.asp?getPickDate=' + date

      return scrapeIt(url, OPTIONS['LEVEL1']).then(({ data, response }) => {
        let nba = []
        let ncaab = []

        data['nba'].forEach(item => {
          if (item['pick'] != '')
            nba.push(item['pick'])
        })
        data['ncaab'].forEach(item => {
          if (item['pick'] != '')
            ncaab.push(item['pick'])
        })
        data = {nba: nba, ncaab: ncaab}
        let items = data[platform]
        let promises = []
        items.forEach((item, index) => {
            promises.push(scrapeIt(base_url + item, OPTIONS['LEVEL2']))
        })
        return Promise.all(promises)
      }).then(result => {
        let data = result.map(r => {
          let picks = []
          r['data']['picks'].forEach(pick => {
            if (pick['handicapper'] != '')
              picks.push(pick)
          })
          r['data']['picks'] = picks
          return r['data']
        })

        let picks = []

        data.forEach(game => {
          game['picks'].forEach(pick => {
            picks.push({
              site: 'cappertek.com',
              handicapper: pick['handicapper'],
              sport: platform,
              away: game['home_name'],
              home: game['away_name'],
              hc_spread: util.safeToFloat(game['hc_spread']),
              hc_ou: util.safeToFloat(game['hc_ou']),
              type: pick['type'],
              h_spread: pick['h_spread'],
              h_ou: pick['h_ou'],
              units: util.safeToInt(pick['units']),
              price: util.safeToFloat(pick['price'])
            })
          })
        })
        return Promise.resolve(picks)
      })
    }
}

module.exports=Cappertek;
