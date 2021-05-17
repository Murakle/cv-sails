/**
 * CvController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

// const GitStats = require("../models/GitStats");

// const GitStats = require("../models/GitStats");

module.exports = {
  getGitStats: async function (req, res) {
    // console.log(await GitStats.find());
    // GitStats.().
    GitStats.find().exec(function (err, lang) {
      if (err) return res.serverError();
      return res.json(lang.sort((a, b) => b.amount - a.amount));
    });
  },
  getGitStatsReady: async function (req, res) {
    // console.log(await GitStats.find());
    // GitStats.().
    GitStats.find().exec(function (err, lang) {
      if (err) return res.serverError();
      const joinGroups = [
        ["Python", "Jupyter Notebook"],
        ["C", "C++"],
      ];
      const banList = ["ShaderLab", "CMake"];
      let finalLanguages = new Map();
      lang
        .filter((lang) => !banList.includes(lang.lang))
        .forEach((value) => {
          added = false;
          joinGroups.forEach((arr) => {
            if (arr.includes(value.lang)) {
              const newLang = arr.join(" / ");
              finalLanguages.set(
                newLang,
                value.amount +
                  (finalLanguages.has(newLang)
                    ? finalLanguages.get(newLang)
                    : 0)
              );
              added = true;
            }
          });
          if (!added) {
            finalLanguages.set(value.lang, value.amount);
          }
        });
      // console.log(finalLanguages);

      const result = [];
      finalLanguages.forEach((value, key) => {
        result.push({
          lang: key,
          amount: value,
        });
      });
      return res.json(result.sort((a, b) => b.amount - a.amount));
    });
  },
};
