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
      items: {
        listItem: "td > div",
        data: "p"
    }
}

class CappersMonitor {
    static scrape(options) {
      let platform = options['platform']
      let url = 'http://www.cappersmonitor.com/today.php'

      return new Promise(function(resolve, reject) {
        scrapeIt(url, OPTIONS).then(({ data, response }) => {
            let result = {nba: [], ncaab: []}
            let items = data['items']
            let index_nba = items.indexOf('NBA  - Pro Basketball')
            let index_ncaab = items.indexOf('NCB - College Basketball')
            let index_nhl = items.indexOf('NHL  - Hockey')

            let nba_items = items.slice(index_nba+3, index_ncaab-3)
            let ncaab_items =  items.slice(index_ncaab+3, index_nhl-3)

            nba_items = _.chunk(nba_items, 3).map(item => {
              let game = item[0].substring(item[0].indexOf('pm')+5, item[0].length)
              let away = game.substring(0, game.indexOf(' at '))
              let home = game.substring(game.indexOf(' at ')+4, game.length)

              let type = ''
              let hc_spread = 0
              let hc_ou = 0
              let h_spread = ''
              let h_ou = ''
              let units = 0
              let price = 0

              if (item[2].startsWith('over') || item[2].startsWith('under')) {
                type = 'OU'
                if (item[2].startsWith('over')) {
                  h_ou = 'OVER'
                } else {
                  h_ou = 'UNDER'
                }
              } else if (item[2].startsWith('available')) {
                type = ''
              } else {
                type = 'SPREAD'
                if (item[2].startsWith(home)) {
                  hc_spread = parseFloat(item[2].replace(home+' ', ''))
                  h_spread = home
                } else {
                  hc_spread = parseFloat(item[2].replace(away+' ', '')) * -1
                  h_spread = away
                }
              }
              return {
                      site: 'cappersmonitor.com',
                      handicapper: item[1],
                      home: home,
                      away: away,
                      type: type,
                      hc_spread: util.safeToFloat(hc_spread),
                      hc_ou: util.safeToFloat(hc_ou),
                      h_spread: h_spread,
                      h_ou: h_ou,
                      units: util.safeToInt(units),
                      price: util.safeToFloat(price)
                    }
            })

            ncaab_items = _.chunk(ncaab_items, 3).map(item => {
              let game = item[0].substring(item[0].indexOf('pm')+5, item[0].length)
              let away = game.substring(0, game.indexOf(' at '))
              let home = game.substring(game.indexOf(' at ')+4, game.length)

              let type = ''
              let hc_spread = 0
              let hc_ou = 0
              let h_spread = ''
              let h_ou = ''
              let units = 0
              let price = 0

              if (item[2].startsWith('over') || item[2].startsWith('under')) {
                type = 'OU'
                if (item[2].startsWith('over')) {
                  h_ou = 'OVER'
                } else {
                  h_ou = 'UNDER'
                }
              } else if (item[2].startsWith('available')) {
                type = ''
              } else {
                type = 'SPREAD'
                if (item[2].startsWith(home)) {
                  hc_spread = parseFloat(item[2].replace(home+' ', ''))
                  h_spread = home
                } else {
                  hc_spread = parseFloat(item[2].replace(away+' ', '')) * -1
                  h_spread = away
                }
              }
              return {
                      site: 'cappersmonitor.com',
                      handicapper: item[1],
                      home: home,
                      away: away,
                      type: type,
                      hc_spread: util.safeToFloat(hc_spread),
                      hc_ou: util.safeToFloat(hc_ou),
                      h_spread: h_spread,
                      h_ou: h_ou,
                      units: util.safeToInt(units),
                      price: util.safeToFloat(price)
                    }
            })
            if (platform == 'nba') {
              resolve(nba_items)
            } else if (platform == 'ncaab') {
              resolve(ncaab_items)
            }
        })
      });

    }
}

module.exports=CappersMonitor;
