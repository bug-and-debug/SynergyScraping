const db=require('./../dbconnection')
const scrapeIt = require("scrape-it")
const scraperjs = require('scraperjs')
const cheerio = require('cheerio')
const request = require('request')
const curl = require('curlrequest');
const util = require('./../manager/util')

const OPTIONS = {
  'nba': {
        matches: {
        listItem: ".component.game",
        data: {
          time: ".status-container > .status-pregame",
          team1_city: {
            selector: ".team > .team-name-container > .team-city > a",
            eq: 0
          },
          team1_name: {
            selector: ".team > .team-name-container > a > span.team-name.desktop-name",
            eq: 0
          },
          team1_record: {
            selector: ".team > .team-name-container > span.record",
            eq: 0
          },
          team2_city: {
            selector: ".team > .team-name-container > .team-city > a",
            eq: 1
          },
          team2_name: {
            selector: ".team > .team-name-container > a > span.team-name.desktop-name",
            eq: 1
          },
          team2_record: {
            selector: ".team > .team-name-container > span.record",
            eq: 1
          },
          scores: {
            listItem: "table.linescore > tr > td.numeric-score"
          }
        }
    }
  },
  'college-basketball': {
        matches: {
        listItem: ".component.game",
        data: {
          time: ".status-container > .status-pregame",
          team1_city: {
            selector: ".team > .team-name-container > .team-city > a",
            eq: 0
          },
          team1_name: {
            selector: ".team > .team-name-container > a > span.team-name.desktop-name",
            eq: 0
          },
          team1_record: {
            selector: ".team > .team-name-container > span.record",
            eq: 0
          },
          team2_city: {
            selector: ".team > .team-name-container > .team-city > a",
            eq: 1
          },
          team2_name: {
            selector: ".team > .team-name-container > a > span.team-name.desktop-name",
            eq: 1
          },
          team2_record: {
            selector: ".team > .team-name-container > span.record",
            eq: 1
          },
          scores: {
            listItem: "table.linescore > tr > td.numeric-score"
          }
        }
    }
  }
}

class Si {
    static scrape(options) {
      let platform = options['platform']
      let date = options['date']
      let url = 'https://www.si.com/'+ platform + '/scoreboard?date=' + date

      return new Promise(function(resolve, reject) {
        scrapeIt(url, OPTIONS[platform]).then(({ data, response }) => {
            let matches = data['matches'].map(match => {
              let team1_scores = match['scores'].slice(0, match['scores'].length / 2 - 1).map(score => {
                if (typeof(score) == 'string')
                  return score
                else
                  return '--'
              })
              let team2_scores = match['scores'].slice(match['scores'].length / 2, match['scores'].length - 1).map(score => {
                if (typeof(score) == 'string')
                  return score
                else
                  return '--'
              })
              let team1_total_score = match['scores'][match['scores'].length / 2 - 1]
              let team2_total_score = match['scores'][match['scores'].length - 1]

              let result = {}
              if (match['time'] == "") { //game finished
                result = {
                  status: "finished",
                  away: {
                    city: match['team1_city'],
                    name: match['team1_name'],
                    total: util.safeToInt(team1_total_score)
                  },
                  home: {
                    city: match['team2_city'],
                    name: match['team2_name'],
                    total: util.safeToInt(team2_total_score)
                  }
                }
              } else {
                result = {
                  status: "future",
                  time: match['time'].slice(0, -4),
                  away: {
                    city: match['team1_city'],
                    name: match['team1_name'],
                  },
                  home: {
                    city: match['team2_city'],
                    name: match['team2_name'],
                  }
                }
              }
              return result
            });
            resolve(matches)
        })
      });
    }
}

module.exports=Si;
