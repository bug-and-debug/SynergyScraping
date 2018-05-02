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
        listItem: "td[colspan=3]",
        data: {
          handicapper: {
            selector: "td > a",
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
          listItem: "td[rowspan=2] > table[cellpadding=0] > tr",
          data: {
            sport: "td[colspan=2] > span",
            away: {
              selector: "td > strong",
              convert: x => {
                return x.substring(0, x.indexOf('@')-1)
              }
            },
            home: {
              selector: "td > strong",
              convert: x => {
                return x.substring(x.indexOf('@')+2, x.length)
              }
            },
            type: {
              selector: "td > em",
              convert: x => {
                let values = x.split(',')
                if (values.length > 1)
                  return values[1].split(' ')[1].trim().toUpperCase() == 'TOTAL' ? 'OU' : values[1].split(' ')[1].trim().toUpperCase()
                else
                  ''
              }
            },
            units: {
              selector: "td > em",
              convert: x => {
                let values = x.split(',')
                if (values.length > 2)
                  return parseInt(values[2].split(' ')[1].trim().toUpperCase())
                else
                  return 0
              }
            },
            price: {
              selector: "td > span > strong",
              convert: x => util.safeToFloat(x.substring(1, x.length))
            },
            time: {
              selector: "td > em",
              convert: x => {
                let values = x.split(',')
                if (values.length > 0)
                  return values[0].split(' ')[0].trim().toUpperCase().substring(1, values[0].split(' ')[0].trim().toUpperCase().length)
                else
                  return ''
              }
            },
            card: {
              selector: "td > a",
              attr: "href"
            }
          }
        }
    },
    LEVEL3: {
      pick: "td[colspan=4] > font[size=4]"
    }
  }
const H_OPTIONS = {
  LEVEL1: {
    items: {
      listItem: "table[cellpadding=5] > tr > td",
      data: {
        url: {
          selector: "strong > a",
          attr: "href"
        }
      }
    }
  },
  LEVEL2: {
    name: {
      selector: "h2",
      eq: 0
    },
    records: {
      listItem: "table[cellspacing=5] > tr > td > table[cellspacing=1] > tr[bgcolor='#ffffff'], tr[bgcolor='#dadada']",
      data: {
        date: {
          selector: "td:nth-child(1)"
        },
        sport: {
          selector: "td:nth-child(2)"
        },
        home: {
          selector: "td:nth-child(3)",
          convert: x => x.split(' @ ')[1] !== undefined ? x.split(' @ ')[1] : ''
        },
        away: {
          selector: "td:nth-child(3)",
          convert: x => x.split(' @ ')[0] !== undefined ? x.split(' @ ')[0] : ''
        },
        type: {
          selector: "td:nth-child(4)",
          convert: x => x.startsWith('Over') || x.startsWith('Under') ? 'OU' : 'SPREAD'
        },
        units: {
          selector: "td:nth-child(4) > span",
          convert: x => x.split(' ')[0].substring(1)
        },
        pick_data: {
          selector: "td:nth-child(4)"
        },
        result: {
          selector: "td:nth-child(5)"
        }
      }
    }
  }
}


class SportsInvestorCentral {
    static async scrape(options) {
      let platform = options['platform'].toUpperCase()
      let base_url = 'https://www.sportsinvestorcentral.com'
      let url = 'https://www.sportsinvestorcentral.com/sports-picks.php?sport=' + platform
      let identify = platform
      if (identify == 'NCAAB') identify = 'NCAA'

      let {data, response} = await scrapeIt(url, OPTIONS['LEVEL1'])

      let items = data['items']
      items =  items.filter((value, index) => !(index%2));

      let handicappers = []
      for (let item of items) {
        let detail = await scrapeIt(base_url + item['handicapper'], OPTIONS['LEVEL2'])
        detail = detail['data']

        let picks = []
        detail['items'].forEach(itm => {
          if (itm['home'] != "" || itm['sport'] != "")
            picks.push(itm)
        })

        //identify sport process
        let startIdx = 0
        let endIdx = picks.length
        let idxs = []
        picks.forEach((itm, index) => {
          if (itm['sport'].startsWith(identify))
            startIdx = index
          if (itm['sport'] != "")
            idxs.push(index)
        })

        idxs.forEach((idx, index) => {
          if (idx == startIdx && index < (idxs.length - 1)) {
            endIdx = idxs[index + 1]
          }
        })

        detail['items'] = picks.slice(startIdx+1, endIdx)
        handicappers.push(detail)
      }

      let picks = []
      handicappers.forEach(handicapper => {
        handicapper['items'].forEach(pick => {
          pick['handicapper'] = handicapper['handicapper_name']
          delete pick['sport']
          picks.push(pick)
        })
      })

      for (let pick of picks) {
        let detail = await scrapeIt({url: base_url + pick['card'], headers: {
            'Cookie': 'username=falber55; password=76d432e75612030f35879eed472d39cb',
            'Accept': '/',
            'Connection': 'keep-alive'
          }}, OPTIONS['LEVEL3'])
        let hc_data = detail['data']['pick']
        let ids = []
        let hc_spread = 0
        let h_spread = ''
        let hc_ou = 0
        let h_ou = ''

        if (pick['type'] == 'SPREAD') {
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
            hc_spread = parseFloat(hc_data.substring(ids[0], ids[1]-1))
            if (h_spread == pick['away'])
              hc_spread = hc_spread * -1
          }
        } else if(pick['type'] = 'OU') {
          let ou_data = hc_data.split(' ')
          if (ou_data.length > 0) {
            h_ou = ou_data[0].toUpperCase()
          }
          if (ou_data.length > 1) {
            hc_ou = parseFloat(ou_data[1])
          }
        }

        pick['hc_spread'] = util.safeToFloat(hc_spread)
        pick['h_spread'] = h_spread.toUpperCase()
        pick['hc_ou'] = util.safeToFloat(hc_ou)
        pick['h_ou'] = h_ou
        pick['site'] = 'sportsinvestorcentral.com'
        delete pick['card']
      }

      return Promise.resolve(picks)
    }

    static async historical(options) {

      let platform = options['platform'].toUpperCase()
      let base_url = 'https://www.sportsinvestorcentral.com'
      let url = 'https://www.sportsinvestorcentral.com/sports-handicappers.php'
      return scrapeIt({url: url, headers: {
          'Cookie': 'username=falber55; password=76d432e75612030f35879eed472d39cb',
          'Accept': '/',
          'Connection': 'keep-alive'
        }}, H_OPTIONS['LEVEL1']).then(async ({ data, response }) => {
          data = (data['items']).map(item => item['url']).filter(url => url !== '')
          let promises = []
          data.forEach(item => {
              promises.push(scrapeIt({url: base_url + item + '&view=last-year', headers: {
                  'Cookie': 'username=falber55; password=76d432e75612030f35879eed472d39cb',
                  'Accept': '/',
                  'Connection': 'keep-alive'
                }}, H_OPTIONS['LEVEL2']))
          })
          return Promise.all(promises)
        }).then(async result => {
          let data = result.map(item => item['data'])
          data.forEach(handicapper => {
            handicapper['records'] = handicapper['records'].filter(record => record['sport'] === platform.toUpperCase())
            handicapper['records'].forEach(record => {
              let hc_data = record['pick_data']
              let ids = []
              let hc_spread = 0
              let h_spread = ''
              let hc_ou = 0
              let h_ou = ''

              if (record['type'] == 'SPREAD') {
                if (hc_data.indexOf('+') > 0)
                  ids.push(hc_data.indexOf('+'))
                if (hc_data.indexOf('-') > 0)
                  ids.push(hc_data.indexOf('-'))
                if (hc_data.indexOf('(') > 0)
                  ids.push(hc_data.indexOf('('))

                ids.sort(function(a, b){return a-b});

                if (ids.length > 0) {
                  h_spread = hc_data.substring(0, ids[0]-1)
                  if (stringSimilarity.compareTwoStrings(h_spread, record['home']) >= stringSimilarity.compareTwoStrings(h_spread, record['away']))
                    h_spread = record['home']
                  else
                    h_spread = record['away']
                }
                if (ids.length > 1) {
                  hc_spread = util.safeToFloat(hc_data.substring(ids[0], ids[1]-1))
                  if (h_spread == record['away'])
                    hc_spread = hc_spread * -1
                }
              } else if(record['type'] = 'OU') {
                let ou_data = hc_data.split(' ')
                if (ou_data.length > 0) {
                  h_ou = ou_data[0].toUpperCase()
                }
                if (ou_data.length > 1) {
                  hc_ou = util.safeToFloat(ou_data[1])
                }
              }

              record['hc_spread'] = hc_spread
              record['h_spread'] = h_spread
              record['hc_ou'] = hc_ou
              record['h_ou'] = h_ou
              //record['date'] = util.convertToDateFormat(record['date'])
              delete record['pick_data']
            })
          })
          return Promise.resolve(data)
        })
    }
}

module.exports=SportsInvestorCentral;
