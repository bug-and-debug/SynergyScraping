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
      handicappers: {
        listItem: "#content > table > tr",
        data: {
          name: "td:nth-child(1).t-t > a",
          picks: {
            listItem: ".t-tr > span[style='color:#666666;']",
            data: {
              home: {
                selector: "strong > a",
                convert: x => x.split('@')[1].trim()
              },
              away: {
                selector: "strong > a",
                convert: x => x.split('@')[0].trim()
              },
              card: {
                selector: "strong > a",
                attr: "href"
              },
              type: {
                selector: "em",
                convert: x => {
                  if (x.indexOf('Spread Line') >= 0)
                    return 'SPREAD'
                  else
                    return 'OU'
                }
              }
            }
          }
        }
      }
    },
    LEVEL2: {
        hc_data: {
          selector: "td[colspan=3] > font[size=4]"
        }
    }
  }

class SportsPicksForum {
    static async scrape(options) {
      let platform = options['platform'].toUpperCase()
      let base_url = 'https://www.sportspicksforum.com'
      let url = 'https://www.sportspicksforum.com/buy-picks.php?sport=' + platform

      return scrapeIt(url, OPTIONS['LEVEL1']).then(async ({ data, response }) => {
        data = data['handicappers'].slice(1)
        let picks = []
        data.forEach(handicapper => {
          handicapper['picks'].forEach(pick => {
            picks.push(Object.assign(pick, {handicapper: handicapper['name']}))
          })
        })

        for (let pick of picks) {
          let card = await scrapeIt({url: base_url + pick['card'], headers: {
              'Cookie': 'username=falber55%40gmail.com; password=76d432e75612030f35879eed472d39cb',
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
            pick['site'] = 'sportspicksforum.com'
            pick['price'] = util.safeToFloat(price)
            delete pick['card']
        }
        return Promise.resolve(picks)
      })
    }
}

module.exports=SportsPicksForum;
