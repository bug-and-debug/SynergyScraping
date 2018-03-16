const db=require('./../dbconnection')
const scrapeIt = require("scrape-it")
const scraperjs = require('scraperjs')
const cheerio = require('cheerio')
const request = require('request')
const curl = require('curlrequest');
const tableScraper = require('table-scraper')
const _ = require('lodash')

const OPTIONS = {
      result: {
        selector: "font[size=4]"
    }
}

class Test {
    static scrape(options) {
      let platform = options['platform']
      let url = 'https://www.sportsinvestorcentral.com/card.php?game=MTk2NTQzNXwxOQ=='

      //   request.get({
      //     headers: {
      //         'Cookie': 'username=falber55; password=76d432e75612030f35879eed472d39cb',
      //         'Accept': '/',
      //         'Connection': 'keep-alive'
      //     },
      //     url:     url
      // }, function(error, response, html){
      //       resolve(html)
      //       //var $ = cheerio.load(html)
      //   });

      return scrapeIt({url: url, headers: {
          'Cookie': 'username=falber55; password=76d432e75612030f35879eed472d39cb',
          'Accept': '/',
          'Connection': 'keep-alive'
        }}, OPTIONS).then(({ data, response }) => {

        return Promise.resolve(data)
      })

    }
}

module.exports=Test;
