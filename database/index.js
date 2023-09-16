const tweets = require("./tweets.js")

const fs = require('fs');

fs.writeFile('.tweets.json', JSON.stringify(tweets)
, err => {
  if (err) {
    console.error(err);
  }
  // fichier écrit avec succès
});