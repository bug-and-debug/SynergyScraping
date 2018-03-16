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
        listItem: ".record-shell",
        data: {
          handicapper: "div:nth-child(1) > h4 > a",
          url: {
            selector: "div:nth-child(1) > h4 > a",
            attr: "href"
          },
          picks: {
            listItem: "div:nth-child(2) > ul > li",
            data: {
              type: "a > span",
              team: "a > strong",
              price: "span.red",
              where: "a > small:last-child"
            }
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
              listItem: "li"
            }
          }
        }
    }
  }

class ASExperts {
    static scrape(options) {
      let base_url = 'https://www.precisionpicks.com'
      let url = 'https://www.precisionpicks.com/handicappers/'

      return scrapeIt(url, OPTIONS['LEVEL1']).then(({ data, response }) => {
        console.log(data['items'].length)
        return Promise.resolve(data)
        // let items = data['items']
        // items = items.slice(1, items.length-1)
        // let promises = []
        // items.forEach(item => {
        //   promises.push(scrapeIt(base_url + item['handicapper'], OPTIONS['LEVEL2']))
        // })
        // return Promise.all(promises)
      })
      // .then(result => {
      //   let data = result.map(r => r['data'])
      //   return Promise.resolve(data)
      // })
    }
}

module.exports=ASExperts;
