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
const fspromis = require('fs').promises
const generateSystem = require('./generate.js');

const yaml = require('js-yaml');
const spherical2cartesian = require('./convert/spherical2cartesian.js');

const { parse } = require('csv-parse');
const shapes2D = require('./src/2dShapes.json');
const path2polygon = require('./d2polygon.js')
const pointInPolygon = require('point-in-polygon');
const Offset = require('polygon-offset');
const iterator = require('iterate-tree');
const gen = require('random-seed');
const intersection = require('array-intersection');
const distance = require('euclidean-distance');
const delay = require('delay');

function squaredDistance(point1, point2) {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return dx * dx + dy * dy + dz * dz;
}


const dimensions = ['x', 'y', 'z'];

const updateDebugputfile = (file) => {
  (async () => {
    await delay(50)
    await fspromis.writeFile('src/FillerDebug.json', JSON.stringify(file, null, '  '), 'utf8');
  })()
}
const debugFile = {}



let newId = 347601;

function distanceToLine(l1, l2, p) {
  const { x: lx1, y: ly1, z: lz1 } = l1;
  const { x: lx2, y: ly2, z: lz2 } = l2;
  const { x: px, y: py, z: pz } = p;

  const ldx = lx2 - lx1;
  const ldz = lz2 - lz1;
  const ldy = ly2 - ly1;
  const lineLengthSquared = ldx*ldx + ldy*ldy + ldz*ldz;
  let t;
  if (!lineLengthSquared) {
    t = 0;
  } else {
    t = ((px - lx1) * ldx + (py - ly1) * ldy + (pz - lz1) * ldz) / lineLengthSquared;

    if (t < 0)
      t = 0;
    else if (t > 1)
      t = 1;
  }

  const lx = lx1 + t * ldx;
  const ly = ly1 + t * ldy;
  const lz = lz1 + t * ldz;
  const dx = px - lx;
  const dy = py - ly;
  const dz = pz - lz;

  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

const applyLocation = function (object, location) {
  object.location = {
    ...object.location,
    ...location,
  }
  if (object?.orbits) {
    for (let orbit of object.orbits) {
      applyLocation(orbit, location);
    }
  }
}

const validLocation = function (object) {
  if (!'location' in object) {
    return false
  }
  if (typeof object.location !== 'object') {
    return false
  }
  if (typeof object.location.x !== 'number') {
    return false
  }
  if (typeof object.location.y !== 'number') {
    return false
  }
  if (typeof object.location.z !== 'number') {
    return false
  }
  return true;
}

const distance2D = function(p1, p2) {
  return Math.sqrt((Math.pow(p1.x-p2.x,2))+(Math.pow(p1.y-p2.y,2)));
}

const collides = function (p1, p2, r) {
  return distance2D(p1, p2) < r;
}

const collides3d = function (p1, p2, r, debug = false) {
  if (debug) {
    console.debug(distance([p1.x, p1.y, p1.z], [p2.x, p2.y, p2.z]))
  }
  return distance([p1.x, p1.y, p1.z], [p2.x, p2.y, p2.z]) < r;
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
      if (!object?.tags) {
        object.tags = [];
      }
      object.tags.push('real');
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
  if (object?.location?.ra && object?.location?.dec && object?.location?.dis) {
    object.location = {
      ...spherical2cartesian(
        object.location.dec,
        object.location.ra,
        object.location.dis,
        false,
      ),
    };
  } else {
    object.location = {
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

function addZ(object, z) {
  if (object?.location && !object.location?.z) {
    object.location.z = z;
  }
  for (let k in object.orbits) {
    addZ(object.orbits[k], z);
  }
}

function addMissingZ(objects, ObjectsWithZ) {

  for (let object of objects) {
    if (typeof object?.location?.z !== 'number' && typeof object?.location?.x == 'number' && typeof object?.location?.y == 'number') {
      for (const key of Object.keys(ObjectsWithZ)) {
        ObjectsWithZ[key].dist = distance2D(object.location, ObjectsWithZ[key].object.location);
      }
      let closest = ObjectsWithZ.sort((A, B) => {
        return A.dist < B.dist ? -1 : 1;
      });

      const randGen = gen.create(object.name);
      const randDist = closest[0].dist / 2;

      console.debug(`${object.name} found, near ${closest[0].object.name}, ${closest[1].object.name}, and ${closest[2].object.name}`)
      addZ(object, ((closest[0].object.location.z + closest[1].object.location.z + closest[2].object.location.z) / 3) + randGen.floatBetween(randDist*-1, randDist));
    }
  }
}

(async () => {
  const raw_data = yaml.load(fs.readFileSync('./catalog.yml', 'utf8'));
  const filler = yaml.load(fs.readFileSync('./filler.yml', 'utf8'));
  for (let object of raw_data) {
    object = await addCoordinates(object);
  }

  let ObjectsWithZ = [];
  let ObjectsWithZOccupied = [];
  iterator.bfs([...raw_data], 'orbits', (object) => {
    let locationString = JSON.stringify(object.location)
    if (typeof object?.location?.z === 'number' && !ObjectsWithZOccupied.includes(locationString)) {
      ObjectsWithZ.push({ dist: null, object: object });
      ObjectsWithZOccupied.push(locationString)
    }
  })

  addMissingZ(raw_data, ObjectsWithZ);

  // the content of this file can be queried at
  // https://gea.esac.esa.int/archive/
  // using the following query:
  //
  // SELECT source_id, ra, dec, pmra, pmdec, parallax
  //   FROM gaiadr3.gaia_source
  //   WHERE parallax > 3.874
  // ORDER BY parallax DESC
  const hygText = fs.readFileSync('./resources/1672477955958O-result.csv', {encoding:'utf8', flag:'r'});

  let hyg = [];
  parse(hygText, {columns: true}, function(err, records) {
    for (let record of records) {
      const ra = parseFloat(record.ra)
      const dec = parseFloat(record.dec)
      const parallax = parseFloat(record.parallax) 
      const parallax_arcsec = parallax * .001
      const dist_pc = 1 / parallax_arcsec
      const dist = dist_pc*3.261564

      Object.assign(record, {
        dist: dist,
        ...spherical2cartesian(dec, ra, dist, false)
      })
    }

    console.debug(`finished processing raw data`)
    
    for (let shape of shapes2D) {
      debugFile[shape.id] = { triangles: [] }

      const randGen = gen.create(shape.d[0]);
      const occupied = [];

      let multipolygon = [];
      for (let d of shape.d) {
        multipolygon.push(path2polygon(d))
      }

      for (let layer of shape.layers) {

        let fittingFiller = [];
        iterator.bfs([...filler], 'orbits', (object) => {
          if (intersection(object.tags, layer.fillerTags).length > 0) {
            if (layer.strategy === 'connect') {
              //object.tags.push('notable');
            }
            fittingFiller.push(object);
          }
        })

        if (layer?.sortFiller === 'random') {
          fittingFiller = fittingFiller.sort((A, B) => randGen.intBetween(-1, 1));
        }

        const relevantPoints = [];

        iterator.bfs([...raw_data], 'orbits', (object) => {
          if (intersection(object.tags, layer.tags).length > 0) {
            relevantPoints.push(object)
          }
        })

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
          if (layer?.sort == 'by_distance') {
            triangles.sort((A, B) => {
              const aDist = distance(A.center, layer.center);
              const bDist = distance(B.center, layer.center);
              return aDist < bDist ? -1 : 1;
            });
          } else {
            triangles.sort((A, B) => A.radius < B.radius ? -1 : 1);
          }
        } else if (relevantPoints.length > 0 && relevantPoints.length < 3) {
          triangles.push(
            {
              radius: shape.radius,
              center: relevantPoints[0].location
            }
          )
        } else if(relevantPoints.length === 0) {
          triangles.push(
            {
              radius: shape.radius,
              center: layer.center,
            }
          )
        }

        for (let existing of relevantPoints) {
          occupied.push(existing.location)
        }
        if (layer.strategy === 'connect') {
          for (triangle of triangles) {
            let isInsomePolygon = false;
            for (const polygon of multipolygon) {
              if (!isInsomePolygon) {
                isInsomePolygon = squaredDistance([triangle.center.x, triangle.center.y], polygon);
              }
            }

            if (isInsomePolygon) {
              let collisionDetected = false;
              for (const point of occupied) {
                const big = randGen.intBetween(0,1)
                if (collides3d(point, triangle.center, (big ? layer.density.min : layer.density.max))) {
                  collisionDetected = true;
                }
              }
              if (!collisionDetected) {
                let chosenFiller = fittingFiller.length > 0 ? [fittingFiller.shift()] : [];
                newId++;
                if (chosenFiller.length > 0) {
                  //chosenFiller[0].tags.push('notable')
                  console.debug(`aquireing location for ${chosenFiller[0].name}`)
                  applyLocation(chosenFiller[0], triangle.center)
                  chosenFiller[0].id = newId;
                  raw_data.push(chosenFiller[0])
                  occupied.push(triangle.center)
                }
              }
            }
          }
        } else
        if (layer.strategy === 'fill') {
          for (triangle of triangles) {
            if (triangle.points) {
              const minX = Math.min(triangle.points.A.location.x, triangle.points.B.location.x, triangle.points.C.location.x)
              const minY = Math.min(triangle.points.A.location.y, triangle.points.B.location.y, triangle.points.C.location.y)
              const minZ = Math.min(triangle.points.A.location.z, triangle.points.B.location.z, triangle.points.C.location.z)

              const maxX = Math.max(triangle.points.A.location.x, triangle.points.B.location.x, triangle.points.C.location.x)
              const maxY = Math.max(triangle.points.A.location.y, triangle.points.B.location.y, triangle.points.C.location.y)
              const maxZ = Math.max(triangle.points.A.location.z, triangle.points.B.location.z, triangle.points.C.location.z)
            }
            const triangleCenter = [triangle.center.x, triangle.center.y, triangle.center.z]

            console.debug(`sorting records by distance to point`)
            records.sort((a, b) => {
              if (typeof minX !== 'undefined') {
                if (
                    (a.x < minX && a.y < minY && a.z < minZ) && 
                    (a.y > maxX && a.y > maxY && a.z > maxZ)
                  ) {
                  return -1
                }
                let shortestA = null;
                let shortestB = null;
                for (const p of ['AB', 'AC', 'BC']) {
                  let distA = distanceToLine(triangle.points[p[0]].location, triangle.points[p[1]].location, a)
                  let distB = distanceToLine(triangle.points[p[0]].location, triangle.points[p[1]].location, b)
                  shortestA = shortestA == null || shortestA > distA ? distA : shortestA;
                  shortestB = shortestB == null || shortestB > distB ? distB : shortestB;
                }
                return shortestA < shortestB ? -1 : 1;
              } else {
                let aDist = squaredDistance(
                  [a.x, a.y, a.z],
                  triangleCenter,
                );
                let bDist = squaredDistance(
                  [b.x, b.y, b.z],
                  triangleCenter,
                );
                return aDist < bDist ? -1 : 1;
              }
            })
            console.debug(`finished sorting records by distance to point`)
            debugFile[shape.id].triangles.push(triangle)
            updateDebugputfile(debugFile)

            for (let id in records) {
              const star = records[id];
              if (collides3d(triangle.center, star, triangle.radius)) {

                let collisionDetected = false;
                for (const point of occupied) {
                  const big = randGen.intBetween(0,1)
                  if (collides(point, star, (big ? layer.density.min : layer.density.max))) {
                    collisionDetected = true;
                  }
                }
                if (!collisionDetected) {
                  newId++
                  let isInsomePolygon = false;
                  for (const polygon of multipolygon) {
                    if (!isInsomePolygon) {
                      isInsomePolygon = pointInPolygon([star.x, star.y], polygon);
                    }
                  }

                  if (isInsomePolygon) {
                    const location = {
                      "x": star.x,
                      "y": star.y,
                      "z": star.z,
                    };

                    raw_data.push({
                      "id": newId,
                      "tags": ['filler'],
                      "filler": true,
                      "location": location,
                    })
                    delete records[id];
                    occupied.push(star)
                  }
                }
              }
            }
          }
        }
      }
    }
    for (let key in raw_data) {
      if (raw_data[key]['filler'] === true) {
        let fittingFiller = [];
        console.debug(filler)
        iterator.bfs([...filler], 'orbits', (object) => {
          if (intersection(object.tags, raw_data[key].tags).length > 0) {
            fittingFiller.push(object);
          }
        })

        let chosenFiller = fittingFiller.length > 0 ? [fittingFiller.shift()] : [];
        if (chosenFiller.length > 0) {
          applyLocation(chosenFiller[0], location)
          newId++;
          chosenFiller[0].id = newId;
        }
        console.debug(`aquireing location for ${chosenFiller?.[0]?.name ?? `FGC-${newId}`}`)
        newId++;
        raw_data[key]["name"] = `FGC-${newId}`
        raw_data[key]["type"] = "star"
        raw_data[key]["orbits"] = chosenFiller
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
