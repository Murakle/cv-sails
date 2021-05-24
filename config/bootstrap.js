/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

// const GitStats = require("../api/models/GitStats");

module.exports.bootstrap = async function (done) {
  const schedule = require('node-schedule');
  const axios = require('axios').default;
  const dotenv = require('dotenv');
  dotenv.config();
  let stats = new Map();
  let added = 0;
  let lAmount = -1;
  let statsGL = new Map();
  let addedGL = 0;
  let lAmountGL = -1;
  let finished = false;

  function updateGitLabStats() {
    var options = {
      method: 'GET',
      url: process.env.GITLAB_URL + '?owned=true&membership=true',
      headers: {
        Authorization: 'Bearer ' + process.env.GITLAB_OAUTH_TOKEN,
      },
    };
    axios
      .request(options)
      .then((response) => {
        lAmountGL = response.data.length;
        response.data.forEach((repo) => {
          const urlLang = process.env.GITLAB_URL + '/' + repo.id + '/languages';
          const urlProj =
            process.env.GITLAB_URL + '/' + repo.id + '?statistics=true';
          getGLRepoStats(urlLang, urlProj);
        });
        return Promise.resolve();
      })
      .catch((err) => {
        sails.log(err);
      });
  }

  function updateGitStats() {
    stats = new Map();
    added = 0;
    lAmount = -1;
    statsGL = new Map();
    addedGL = 0;
    lAmountGL = -1;
    finished = false;
    updateGitLabStats();
    // GitStats.destroy({});
    var options = {
      method: 'GET',
      url: process.env.GIT_URL + process.env.GIT_USERNAME,
      headers: {
        Authorization: 'token ' + process.env.GIT_OAUTH_TOKEN,
      },
    };
    axios
      .request(options)
      .then((response) => {
        lAmount = response.data.items.length;
        response.data.items.forEach((repo) => {
          getRepoStats(repo.languages_url);
        });
        return Promise.resolve();
      })
      .catch((err) => sails.log(err));
  }

  async function finish() {
    finished = true;
    await GitStats.destroy({});
    const finalStats = new Map();
    stats.forEach((value, key) => {
      finalStats.set(key, value + (statsGL.has(key) ? statsGL.get(key) : 0));
    });
    // sails.log(statsGL);
    // sails.log(stats);
    // sails.log(finalStats);

    await finalStats.forEach(async (key, value) => {
      await GitStats.create({
        lang: value,
        amount: key,
      }).fetch();
    });
    sails.log('GitHub updated');
  }

  function getGLRepoStats(urlLang, urlProj) {
    var options = {
      method: 'GET',
      url: urlLang,
      headers: {
        Authorization: 'Bearer ' + process.env.GITLAB_OAUTH_TOKEN,
      },
    };
    axios
      .request(options)
      .then(function (response) {
        var options2 = {
          method: 'GET',
          url: urlProj,
          headers: {
            Authorization: 'Bearer ' + process.env.GITLAB_OAUTH_TOKEN,
          },
        };
        axios
          .request(options2)
          .then(function (response2) {
            let dataSize = response2.data.statistics.repository_size;
            Object.entries(response.data).forEach(([lang, amount]) => {
              let finalAmount = Math.floor(((amount * dataSize) / 100) * 0.5);
              statsGL.set(
                lang,
                (statsGL.has(lang) ? statsGL.get(lang) : 0) + finalAmount
              );
            });
          })
          .then(() => {
            addedGL++;
            if (added === lAmount && addedGL === lAmountGL && !finished) {
              finish();
              return Promise.resolve();
            }
          })
          .catch((err) => sails.log(err));
      })
      .catch((error) => {
        sails.log(error);
        return Promise.reject(error);
      });
  }

  function getRepoStats(url) {
    var options = {
      method: 'GET',
      url: url,
      headers: {
        Authorization: 'token ' + process.env.GIT_OAUTH_TOKEN,
      },
    };
    axios
      .request(options)
      .then((response) => {
        Object.entries(response.data).forEach(([lang, amount]) => {
          stats.set(lang, (stats.has(lang) ? stats.get(lang) : 0) + amount);
        });
        added++;
        if (added === lAmount && addedGL === lAmountGL && !finished) {
          finish();
          return Promise.resolve();
        }
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  updateGitStats();
  // await updateGitLabStats();
  schedule.scheduleJob('*/10 * * * *', () => {
    updateGitStats();
  });
  return done();
};
