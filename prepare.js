const WBK = require('wikibase-sdk');
const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
});
const { fetchBuilder, FileSystemCache } = require('node-fetch-cache');
const fetch = fetchBuilder.withCache(new FileSystemCache({
  ttl: 86400000, 
}));
const fs = require('fs');
const generateSystem = require('./generate.js');

const yaml = require('js-yaml');
const spherical2cartesian = require('./convert/spherical2cartesian.js');
const defaultLocation = { z: 0 }

const { parse } = require('csv-parse');
const shapes2D = require('./src/2dShapes.json');
const parseSVG = require('svg-path-parser');
const pointInPolygon = require('point-in-polygon');
const Offset = require('polygon-offset');
const iterator = require('iterate-tree');
const gen = require('random-seed');

const validLocation = function (object) {
  if (!'location' in object) {
    return false
  }
  if (typeof object.location != 'object') {
    return false
  }
  if (typeof object.location.x != 'number') {
    return false
  }
  if (typeof object.location.y != 'number') {
    return false
  }
  if (typeof object.location.z != 'number') {
    return false
  }
  return true;
}

const collides = function (p1, p2, r) {
  return Math.sqrt((Math.pow(p1.x-p2.x,2))+(Math.pow(p1.y-p2.y,2))) < r;
}

let idCounter = 0;

async function addCoordinates(object, depth = 0, parentLocation) {
  if (!object?.id) {
    object.id = idCounter;
    idCounter++;
  }
  if (!object?.type) {
    object.type = depth === 0 ? 'star' : 'planet';
  }
  if (object.type == 'star') {
    generateSystem(object);
  }
  if (!'location' in object) {
    object.location = [];
  }

  if (
    typeof object.location === 'string' &&
    object.location.startsWith('wd:Q')
  ) {
    console.debug(`aquireing location for ${object.name}`);
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
  } else {
    object.location = {
      ...defaultLocation,
      ...parentLocation,
      ...object.location,
    }
  }
  if (object?.orbits && object.orbits.length > 0) {
    depth++;
    for (let i in object.orbits) {
      object.orbits[i] = await addCoordinates(object.orbits[i], depth, object.location);
    }
  }
  return object;
}

(async () => {
  let output = [];
  const raw_data = yaml.load(fs.readFileSync('./catalog.yml', 'utf8'));
  for (let object of raw_data) {
    object = await addCoordinates(object);
  }

  const hygText = fs.readFileSync('.resources/hygxyz.csv', {encoding:'utf8', flag:'r'});

  let hyg = [];
  parse(hygText, {columns: true}, function(err, records) {
    for (let shape of shapes2D) {

      const occupied = [];

      iterator.bfs([...raw_data], 'orbits', (object) => {
        if (object?.tags?.includes(shape.tag) && validLocation(object)) {
          occupied.push(object.location);
        }
      });

      const randGen = gen.create(shape.d);

      const path = parseSVG(shape.d);
      let polygon = [];
      for (const point of path) {
        switch (point.code) {
          case 'M':
          case 'L':
          case 'C':
            polygon.push([
              point.x,
              point.y *-1,
            ]);
          break;
        }
      }
      const offset = new Offset();
      const smallerPolygon = offset.data([polygon]).padding(shape.inset ?? 6);

      const recordsSorted = [ ...records ];
      recordsSorted.sort((a, b) => { 
        const aDist = Math.abs(parseFloat(a.Z)) - Math.abs(shape.z);
        const bDist = Math.abs(parseFloat(b.Z)) - Math.abs(shape.z);
        return aDist - bDist;
      })

      for (let star of recordsSorted) {
        if (pointInPolygon([star.X, star.Y], smallerPolygon[0])) {
          let collisionDetected = false;
          for (const point of occupied) {
            if (collides(point, {x: parseFloat(star.X), y: parseFloat(star.Y)}, randGen.intBetween(shape.minDistance,shape.maxDistance))) {
              collisionDetected = true;
            }
          }

          if (!collisionDetected) {
            console.debug(`aquiring location of HD ${star.HD}`,)
            occupied.push({x: parseFloat(star.X), y: parseFloat(star.Y)})
            raw_data.push({
              "name": `HD ${star.HD}`,
              "type": "star",
              "tags": [shape.tag], 
              "location": {
                "y": parseFloat(star.Y),
                "x": parseFloat(star.X),
                "z": parseFloat(star.Z),
              }
            })
          }
        }
      }
    }

    fs.writeFile(
      './src/catalog.json',
      JSON.stringify(raw_data, null, '  '),
      'utf8',
      () => {
        console.log('Done');
      },
    );
  });


})();
