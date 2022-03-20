const WBK = require('wikibase-sdk');
const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
});
const { fetchBuilder, MemoryCache } = require('node-fetch-cache');
const fetch = fetchBuilder.withCache(new MemoryCache({ttl: 86400}));
const fs = require('fs');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const turndownService = new TurndownService();

const yaml = require('js-yaml');
const spherical2cartesian = require('./convert/spherical2cartesian.js');

const mwIntroExtractor = (dom, selector) => {
  const $ = cheerio.load(dom);
  let main = $(selector);
  main.children('div, figure, aside, table, h2 ~ *, h2').remove();
  return turndownService.turndown(main.html());
};

let idCounter = 0;

async function addCoordinates(object) {
  if (!object?.id) {
    object.id = idCounter;
    idCounter++;
  }
  if (
    typeof object.location === 'string' &&
    object.location.startsWith('wd:Q')
  ) {
    console.debug(`aquireing location for ${object.name} from wikidata`);
    const url = wdk.sparqlQuery(
      `
     SELECT ?ra ?dec ?dis ?disUnit WHERE {
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      ${object.location} wdt:P6257 ?ra.
      ${object.location} wdt:P6258 ?dec.
      ${object.location} p:P2583/psv:P2583 ?disStatement.
      ?disStatement wikibase:quantityAmount ?dis.
      ?disStatement wikibase:quantityUnit ?disUnit.        
     }

     LIMIT 1
    `,
    );
    let headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'https://github.com/fuddl/stellarZ',
    };
    const result = await fetch(url, {
      headers: headers,
      cache: 'cache',
    });
    const json = await result.json();
    const data = wdk.simplify.sparqlResults(json)[0];
    if (data) {
      object.location = {
        ...spherical2cartesian(
          data.dec,
          data.ra,
          data.dis?.value,
          data.dis?.unit.endsWith('Q12129'),
        ),
      };
    }
  }
  if (object?.orbits && object.orbits.length > 0) {
    for (let i in object.orbits) {
      object.orbits[i] = await addCoordinates(object.orbits[i]);
    }
  }
  return object;
}

(async () => {
  let output = [];
  const raw_data = yaml.load(fs.readFileSync('./src/catalog.yml', 'utf8'));
  for (let object of raw_data) {
    object = await addCoordinates(object);
  }

  fs.writeFile(
    './src/catalog.json',
    JSON.stringify(raw_data, null, '  '),
    'utf8',
    () => {
      console.log('Done');
    },
  );
})();
