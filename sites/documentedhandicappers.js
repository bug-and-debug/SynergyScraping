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
        listItem: ".t-line",
        data: {
          handicapper: {
            selector: "td > div > a",
            attr: "href"
          }
        }
      }
    },
    LEVEL2: {
        handicapper_name: {
          selector: "td > h2",
          eq: 0
        },
        items: {
          listItem: ".buypicks",
          data: {
            picks: {
              listItem: "li",
              data: {
                url: {
                  selector: "a",
                  attr: "href"
                },
                home: {
                  selector: "strong",
                  convert: x => {
                    return x.split('@')[1].trim()
                  }
                },
                away: {
                  selector: "strong",
                  convert: x => {
                    return x.split('@')[0].trim()
                  }
                },
                units: {
                  selector: "em",
                  convert: x => {
                    let units = 0
                    if (x.indexOf('Unit') > 0) {
                      units = util.safeToInt(x.substring(0, x.indexOf('Unit')-1))
                    }
                    return units
                  }
                }
              }
            }
          }
        }
    },
    LEVEL3: {
      price: {
        selector: "table[cellpadding=5] > tr:nth-child(6) > td",
        convert: x => util.safeToFloat(x.substring(7))
      },
      hc_data: {
        selector: "table[cellpadding=5] > tr:nth-child(7) > td",
        convert: x => x.substring(6)
      },
      type: {
        selector: "table[cellpadding=5] > tr:nth-child(7) > td",
        convert: x => {
          if (x.substring(6).startsWith('Over') || x.substring(6).startsWith('Under'))
            return 'OU'
          else
            return 'SPREAD'
        }
      }
    }
  }

class DocumentedHandicappers {
    static async scrape(options) {
      let platform = options['platform'].toUpperCase()
      let base_url = 'https://www.documentedhandicappers.com'
      let url = 'https://www.documentedhandicappers.com/documented-sports-picks.php?sport=' + platform

      return scrapeIt(url, OPTIONS['LEVEL1']).then(async ({ data, response }) => {
        let items = data['items']
        items = items.slice(1, items.length-1)
        let promises = []
        items.forEach(item => {
          promises.push(scrapeIt({url: base_url + item['handicapper'], headers: {
              'Cookie': 'username=falber55%40gmail.com; password=76d432e75612030f35879eed472d39cb',
              'Accept': '/',
              'Connection': 'keep-alive'
            }}, OPTIONS['LEVEL2']))
        })
        return Promise.all(promises)
      }).then(async result => {
        let data = result.map(r => r['data'])

        let picks = []
        data.forEach(handicapper => {
          let items = handicapper['items']
          let target_picks = []
          if (platform == 'NBA') {
            target_picks = items[0]['picks']
          } else {
            if (picks.length > 1)
              target_picks = items[1]['picks']
            else
              target_picks = items[0]['picks']
          }

          delete handicapper['items']
          handicapper['picks'] = target_picks
        })

        //only get result that pick available
        picks = []
        data.forEach(handicapper => {
          handicapper['picks'].forEach(pick => {
            if (pick['url'] !== "")
              picks.push(Object.assign(pick, {handicapper: handicapper['handicapper_name']}))
          })
        })


        for (let pick of picks) {
          let hc_data = await scrapeIt({url: base_url + pick['url'], headers: {
              'Cookie': 'username=falber55%40gmail.com; password=76d432e75612030f35879eed472d39cb',
              'Accept': '/',
              'Connection': 'keep-alive'
            }}, OPTIONS['LEVEL3'])

          let type = hc_data['data']['type']
          let data = hc_data['data']['hc_data']
          let price = hc_data['data']['price']
          let ids = []
          let hc_spread = 0
          let h_spread = ''
          let hc_ou = 0
          let h_ou = ''

          if (type == 'SPREAD') {
            if (data.indexOf('+') > 0)
              ids.push(data.indexOf('+'))
            if (data.indexOf('-') > 0)
              ids.push(data.indexOf('-'))
            if (data.indexOf('(') > 0)
              ids.push(data.indexOf('('))

            ids.sort(function(a, b){return a-b});

            if (ids.length > 0) {
              h_spread = data.substring(0, ids[0]-1)
              if (stringSimilarity.compareTwoStrings(h_spread, pick['home']) > stringSimilarity.compareTwoStrings(h_spread, pick['away']))
                h_spread = pick['home']
              else
                h_spread = pick['away']
            }
            if (ids.length > 1) {
              hc_spread = util.safeToFloat(data.substring(ids[0], ids[1]-1))
              if (h_spread == pick['away'])
                hc_spread = hc_spread * -1
            }
          } else if(type = 'OU') {
            let ou_data = data.split(' ')
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
          pick['site'] = 'documentedhandicappers.com'
          pick['type'] = type
          pick['price'] = util.safeToFloat(price)
          delete pick['url']
        }

        return Promise.resolve(picks)
      })
    }
}

module.exports=DocumentedHandicappers;
