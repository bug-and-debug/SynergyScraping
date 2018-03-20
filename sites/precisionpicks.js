const db=require('./../dbconnection')
const scrapeIt = require("scrape-it")
const scraperjs = require('scraperjs')
const cheerio = require('cheerio')
const request = require('request')
const curl = require('curlrequest');
const tableScraper = require('table-scraper')
const _ = require('lodash')
const stringSimilarity = require('string-similarity')
const util = require('./../manager/util')

const OPTIONS = {
    LEVEL1: {
      items: {
        listItem: ".record-shell",
        data: {
          handicapper: {
            selector: "div:nth-child(1) > h4 > a",
            convert: x => x.split('-')[1].trim()
          },
          picks: {
            listItem: "div:nth-child(2) > ul > li.viewpick",
            data: {
              home: {
                selector: "a > strong",
                convert: x => x.split(' vs ')[1]
              },
              away: {
                selector: "a > strong",
                convert: x => x.split(' vs ')[0]
              },
              type: {
                selector: "a > small:last-child",
                convert: x => {
                  if (x.indexOf('On the total') >= 0)
                    return 'OU'
                  else
                    return 'SPREAD'
                }
              },
              card: {
                selector: "a",
                attr: "href"
              }
            }
          }
        }
      }
    },
    LEVEL2: {
        hc_data: {
          selector:  "li.paid > a.add_pick > small > span.d",
          convert: x => x.substring(0, x.length/2)
        }
    }
  }

class PrecisionPicks {
    static async scrape(options) {
      let base_url = 'https://www.precisionpicks.com'
      let url = 'https://www.precisionpicks.com/nba/'

      return scrapeIt({url: url, headers: {
          'Cookie': 'a=eyJpZCI6IjYwMTI2IiwibG9naW4iOiJmYWxiZXI1NUBnbWFpbC5jb20iLCJwYXNzd29yZCI6Ijc2ZDQzMmU3NTYxMjAzMGYzNTg3OWVlZDQ3MmQzOWNiIn0%3D',
          'Accept': '/',
          'Connection': 'keep-alive'
        }}, OPTIONS['LEVEL1']).then(async ({ data, response }) => {
        data = data['items']
        let picks = []
        data.forEach(handicapper => {
          handicapper['picks'].forEach(pick => {
            picks.push(Object.assign(pick, {handicapper: handicapper['handicapper']}))
          })
        })

        for (let pick of picks) {
          let card = await scrapeIt({url: base_url + pick['card'], headers: {
              'Cookie': 'a=eyJpZCI6IjYwMTI2IiwibG9naW4iOiJmYWxiZXI1NUBnbWFpbC5jb20iLCJwYXNzd29yZCI6Ijc2ZDQzMmU3NTYxMjAzMGYzNTg3OWVlZDQ3MmQzOWNiIn0%3D',
              'Accept': '/',
              'Connection': 'keep-alive'
            }}, OPTIONS['LEVEL2'])

            let type = pick['type']
            let hc_data = card['data']['hc_data']
            let price = 0
            let ids = []
            let hc_spread = 0
            let h_spread = ''
            let hc_ou = 0
            let h_ou = ''

            if (type == 'SPREAD') {
              if (hc_data.indexOf('+') > 0)
                ids.push(hc_data.indexOf('+'))
              if (hc_data.indexOf('-') > 0)
                ids.push(hc_data.indexOf('-'))
              if (hc_data.indexOf('(') > 0)
                ids.push(hc_data.indexOf('('))

              ids.sort(function(a, b){return a-b});

              if (ids.length > 0) {
                h_spread = hc_data.substring(0, ids[0]-1)
                if (stringSimilarity.compareTwoStrings(h_spread, pick['home']) > stringSimilarity.compareTwoStrings(h_spread, pick['away']))
                  h_spread = pick['home']
                else
                  h_spread = pick['away']
              }
              if (ids.length > 1) {
                hc_spread = util.safeToFloat(hc_data.substring(ids[0], ids[1]-1))
                if (h_spread == pick['away'])
                  hc_spread = hc_spread * -1
              }
            } else if(type = 'OU') {
              let ou_data = hc_data.split(' ')
              if (ou_data.length > 0) {
                h_ou = ou_data[0].toUpperCase()
              }
              if (ou_data.length > 1) {
                hc_ou = util.safeToFloat(ou_data[1])
              }
            }

            pick['hc_spread'] = util.safeToFloat(hc_spread)
            pick['h_spread'] = h_spread.toUpperCase()
            pick['hc_ou'] = util.safeToFloat(hc_ou)
            pick['h_ou'] = h_ou
            pick['site'] = 'precisionpicks.com'
            pick['price'] = util.safeToFloat(price)
            delete pick['card']
        }

        return Promise.resolve(picks)
      })
    }
}

module.exports=PrecisionPicks;
