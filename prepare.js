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
const path2polygon = require('./d2polygon.js')
const pointInPolygon = require('point-in-polygon');
const Offset = require('polygon-offset');
const iterator = require('iterate-tree');
const gen = require('random-seed');
const intersection = require('array-intersection');
const distance = require('euclidean-distance');

const dimensions = ['x', 'y', 'z'];

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
  const filler = yaml.load(fs.readFileSync('./filler.yml', 'utf8'));
  for (let object of raw_data) {
    object = await addCoordinates(object);
  }

  const hygText = fs.readFileSync('.resources/hygxyz.csv', {encoding:'utf8', flag:'r'});

  let hyg = [];
  parse(hygText, {columns: true}, function(err, records) {
    
    const occupied = [];
    for (let shape of shapes2D) {
    const randGen = gen.create(shape.d[0]);

      let multipolygon = [];
      for (let d of shape.d) {
        multipolygon.push(path2polygon(d))
      }

      const relevantPoints = [];

      iterator.bfs([...raw_data], 'orbits', (object) => {
        if (intersection(object.tags, shape.tags).length > 0) {
          relevantPoints.push(object)
        }
      })

      let fittingFiller = [];
      iterator.bfs([...filler], 'orbits', (object) => {
        if (intersection(object.tags, shape.tags).length > 0) {
          object.tags.push('notable');
          fittingFiller.push(object);
        }
      })

      fittingFiller = fittingFiller.sort((A, B) => randGen.intBetween(-1, 1));

      const triangles = [];
      if (relevantPoints.length > 2) {
        for (let A of relevantPoints) {
          const triangle = {
            points: {
              A: A,
            },
            center: {},
          }
          let DistanceB = null;
          for (let B of relevantPoints) {
            if (B != A) {
              let dist = distance(
                [A.location.x, A.location.y, A.location.z],
                [B.location.x, B.location.y, B.location.z],
              );
              if (DistanceB === null || DistanceB > dist) {
                DistanceB = dist;
                triangle.points.B = B;
              }
            }
          }
          let DistanceC = null;
          for (let C of relevantPoints) {
            if (C != A && C != triangle.points.B) {
              let dist = distance(
                [A.location.x, A.location.y, A.location.z],
                [C.location.x, C.location.y, C.location.z],
              );
              if (DistanceC === null || DistanceC > dist) {
                DistanceC = dist;
                triangle.points.C = C;
              }
            }
          }
          triangle.radius = DistanceB < DistanceC ? DistanceB : DistanceC;
          for (let dim of dimensions) {
            triangle.center[dim] = (
              triangle.points.A.location[dim] + 
              triangle.points.B.location[dim] + 
              triangle.points.C.location[dim]
            ) / 3;
          }
          triangles.push(triangle);
        }
        triangles.sort((A, B) => A.radius < B.radius ? -1 : 1);
      }

      if (relevantPoints.length == 1 || relevantPoints.length < 3) {
        triangles.push(
          {
            radius: 1000,
            center: {
              x: relevantPoints[0].location.x,
              y: relevantPoints[0].location.y,
              z: relevantPoints[0].location.z,
            } 
          }
        )
      }

      for (triangle of triangles) {
        
        records.sort((a, b) => {
          let aDist = 0; 
          let bDist = 0; 
          for (let dim of dimensions) {
            const DIM = dim.toUpperCase();
            aDist += Math.abs(parseFloat(a[DIM])) - Math.abs(triangle.center[dim]);
            bDist += Math.abs(parseFloat(b[DIM])) - Math.abs(triangle.center[dim]);
          }
          return (aDist / 3) - (bDist / 3);
        })

        let occupied = []
        for (let existing of relevantPoints) {
          occupied.push({x: existing.location.x, y: existing.location.y})
        }
        for (let id in records) {
          const star = records[id];
          if (collides(triangle.center, {x: parseFloat(star.X), y: parseFloat(star.Y)}, triangle.radius)) {


            let collisionDetected = false;
            for (const point of occupied) {
              const big = randGen.intBetween(0,1)
              if (collides(point, {x: parseFloat(star.X), y: parseFloat(star.Y)}, (big ? 12 : 24))) {
                collisionDetected = true;
                delete records[id];
              }
            }
            if (!collisionDetected) {
              let isInsomePolygon = false;
              for (const polygon of multipolygon) {
                if (!isInsomePolygon) {
                  isInsomePolygon = pointInPolygon([star.X, star.Y], polygon);
                }
              }

              if (isInsomePolygon) {
                console.debug(`aquireing location for ${shape.id} HD ${star.HD}`)
                const location = {
                  "y": parseFloat(star.Y),
                  "x": parseFloat(star.X),
                  "z": parseFloat(star.Z),
                };
                let chosenFiller = fittingFiller.length > 0 ? [fittingFiller.shift()] : [];
                if (chosenFiller.length > 0) {
                  chosenFiller[0].location = location;
                }
                raw_data.push({
                  "name": `HD ${star.HD}`,
                  "type": "star",
                  "orbits": chosenFiller, 
                  "tags": chosenFiller.length > 0 ? [] : shape.tags, 
                  "location": location
                })
                occupied.push({x: parseFloat(star.X), y: parseFloat(star.Y)})
                delete records[id];
              }
            }
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
