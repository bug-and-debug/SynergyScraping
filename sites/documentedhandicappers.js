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
                }
              }
            }
          }
        }
    }
  }

class DocumentedHandicappers {
    static scrape(options) {
      let platform = options['platform'].toUpperCase()
      let base_url = 'https://www.documentedhandicappers.com'
      let url = 'https://www.documentedhandicappers.com/documented-sports-picks.php?sport=' + platform

      return scrapeIt(url, OPTIONS['LEVEL1']).then(({ data, response }) => {
        let items = data['items']
        items = items.slice(1, items.length-1)
        let promises = []
        items.forEach(item => {
          promises.push(scrapeIt(base_url + item['handicapper'], OPTIONS['LEVEL2']))
        })
        return Promise.all(promises)
      }).then(result => {
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

        return Promise.resolve(data)
      })
    }
}

module.exports=DocumentedHandicappers;
