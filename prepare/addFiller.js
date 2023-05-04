const shapes = require('../src/2dShapes.json')
const gen = require('random-seed')
const path2polygon = require('../d2polygon.js')
const iterator = require('iterate-tree')
const intersection = require('array-intersection')
const spherical2cartesian = require('../convert/spherical2cartesian.js')
const fs = require('fs').promises
const { parse } = require('csv-parse')
const yaml = require('js-yaml')
const pointInPolygon = require('point-in-polygon')
const delay = require('delay');

const dimensions = ['x', 'y', 'z']

const distance = require('euclidean-distance');

function squaredDistance(point1, point2) {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return dx * dx + dy * dy + dz * dz;
}

const distance2D = function(p1, p2) {
  return Math.sqrt((Math.pow(p1.x-p2.x,2))+(Math.pow(p1.y-p2.y,2)));
}

const collides3d = function (p1, p2, r, debug = false) {
	if (debug) {
		console.debug({ p1: [p1.x, p1.y, p1.z]})
		console.debug({ p2:[p2.x, p2.y, p2.z]})
		console.debug({r})
		console.debug({distance: distance([p1.x, p1.y, p1.z], [p2.x, p2.y, p2.z])})
	}
  return distance([p1.x, p1.y, p1.z], [p2.x, p2.y, p2.z]) < r
}

const collides = function (p1, p2, r) {
  return distance2D(p1, p2) < r;
}

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

function distanceSquaredToLine(l1, l2, p) {
  const lx1 = l1.x;
  const ly1 = l1.y;
  const lz1 = l1.z;
  const lx2 = l2.x;
  const ly2 = l2.y;
  const lz2 = l2.z;
  const px = p.x;
  const py = p.y;
  const pz = p.z;

  const ldx = lx2 - lx1;
  const ldy = ly2 - ly1;
  const ldz = lz2 - lz1;
  const lineLengthSquared = ldx * ldx + ldy * ldy + ldz * ldz;

  let t;
  if (!lineLengthSquared) {
    t = 0;
  } else {
    t = ((px - lx1) * ldx + (py - ly1) * ldy + (pz - lz1) * ldz) / lineLengthSquared;

    if (t < 0) {
      t = 0;
    } else if (t > 1) {
      t = 1;
    }
  }

  const lx = lx1 + t * ldx;
  const ly = ly1 + t * ldy;
  const lz = lz1 + t * ldz;

  const dx = px - lx;
  const dy = py - ly;
  const dz = pz - lz;

  return dx * dx + dy * dy + dz * dz;
}


const updateDebugputfile = (file) => {
	(async () => {
		await delay(50)
  	await fs.writeFile('./src/FillerDebug.json', JSON.stringify(file, null, '  '), 'utf8');
	})()
}

async function addFiller(data, callback) {
	const debugFile = {}

	console.debug('adding filler')

	const filler = yaml.load(await fs.readFile('./filler.yml', 'utf8'));
  const gaiaData = await fs.readFile('./resources/1672477955958O-result.csv', 'utf8');

  await new Promise((resolve, reject) => {
	 	parse(gaiaData, {columns: true}, async function(err, records) {
	  	console.debug('scannig GAIA records')
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
	  


		  for (let shape of shapes) {
		  	console.debug(`Scanning for filler "${shape.id}"`)
	    	debugFile[shape.id] = { triangles: [] }

		    const randGen = gen.create(shape.d[0]);
		    const occupied = [];

		    let multipolygon = [];
		    for (let d of shape.d) {
		      multipolygon.push(path2polygon(d))
		    }
		    for (let layer of shape.layers) {


		      const relevantPoints = [];

		      const findRelevantPoints = (data, parentLocation = {}) => {
		      	for (let object of data) {
			        if (intersection(object.tags, layer.tags).length > 0) {
			          relevantPoints.push({
			          	object: object,
			          	location: { ...parentLocation, ...object.location }
			          })
			        }
			        if (object.orbits) {
			        	findRelevantPoints(object.orbits, { ...parentLocation, ...object.location })
			        }
			      }
		      }

		      findRelevantPoints(data)
		      console.debug(relevantPoints.length)
		      
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
	            	if (JSON.stringify(B) === JSON.stringify(A)) {
	            		continue
	            	}
	              let dist = distance(
	                [A.location.x, A.location.y, A.location.z],
	                [B.location.x, B.location.y, B.location.z],
	              );
	              if (dist > 0 || DistanceB === null || DistanceB > dist) {
	                DistanceB = dist;
	                triangle.points.B = B;
	              }
	            }
	            let DistanceC = null;
	            for (let C of relevantPoints) {
	            	if (JSON.stringify(triangle.points.B) === JSON.stringify(C) || JSON.stringify(triangle.points.A) === JSON.stringify(C)) {
	            		continue
	            	}
	              let dist = distance(
	                [A.location.x, A.location.y, A.location.z],
	                [C.location.x, C.location.y, C.location.z],
	              )
	              if (dist > 0 || DistanceC === null || DistanceC > dist) {
	                DistanceC = dist;
	                triangle.points.C = C;
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
		            const aDist = squaredDistance(A.center, layer.center);
		            const bDist = squaredDistance(B.center, layer.center);
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
		              isInsomePolygon = pointInPolygon([triangle.center.x, triangle.center.y], polygon);
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
	                data.push({
	                	tags: ['filler', ...layer.fillerTags],
	                	location: triangle.center,
	                })
	                occupied.push(triangle.center)

	                await callback()
		            }
		          }
		        }
		      } else
		      if (layer.strategy === 'fill') {
		        for (triangle of triangles) {
		        	let minX, minY, minZ, maxX, maxY, maxZ
		          if (triangle.points) {
		            minX = Math.min(triangle.points.A.location.x, triangle.points.B.location.x, triangle.points.C.location.x)
		            minY = Math.min(triangle.points.A.location.y, triangle.points.B.location.y, triangle.points.C.location.y)
		            minZ = Math.min(triangle.points.A.location.z, triangle.points.B.location.z, triangle.points.C.location.z)

		            maxX = Math.max(triangle.points.A.location.x, triangle.points.B.location.x, triangle.points.C.location.x)
		            maxY = Math.max(triangle.points.A.location.y, triangle.points.B.location.y, triangle.points.C.location.y)
		            maxZ = Math.max(triangle.points.A.location.z, triangle.points.B.location.z, triangle.points.C.location.z)
		          }
		          const triangleCenter = [triangle.center.x, triangle.center.y, triangle.center.z]

		          const squaredRadius = triangle.radius ** 2;

		          const candidateRecords = records.filter(obj => {
								const dx = obj.x - triangle.center.x;
								const dy = obj.y - triangle.center.y;
								const dz = obj.z - triangle.center.z;
								const squaredDistance = dx ** 2 + dy ** 2 + dz ** 2;
								return squaredDistance <= squaredRadius;
							});

		          //console.debug(`sorting records by distance to point`)
		          candidateRecords.sort((a, b) => {
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
		                let distA = distanceSquaredToLine(triangle.points[p[0]].location, triangle.points[p[1]].location, a)
		                let distB = distanceSquaredToLine(triangle.points[p[0]].location, triangle.points[p[1]].location, b)
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
		          
		          debugFile[shape.id].triangles.push(triangle)
		        	updateDebugputfile(debugFile)
		          for (let id in candidateRecords) {
		            const star = candidateRecords[id];

		            if (collides3d(triangle.center, star, triangle.radius)) {
		              let collisionDetected = false;
		              for (const point of occupied) {
		                const big = randGen.intBetween(0,1)
		                if (collides(point, star, (big ? layer.density.min : layer.density.max))) {
		                  collisionDetected = true;
		                }
		              }

		              if (!collisionDetected) {

		                let isInsomePolygon = false;
		                for (const polygon of multipolygon) {
		                  if (!isInsomePolygon) {
		                    isInsomePolygon = pointInPolygon([star.x, star.y], polygon);
		                  }
		                }

		                //console.debug({isInsomePolygon})
		                if (isInsomePolygon) {
		                  const location = {
		                    "x": star.x,
		                    "y": star.y,
		                    "z": star.z,
		                  };


		                  data.push({
		                    "tags": ['filler', ...layer.fillerTags],
		                    "filler": true,
		                    "location": location,
		                  })
		                  delete candidateRecords[id];
		                  //console.debug({found: star})
		                  occupied.push(star)

			                await callback()
		                }
		              }
		            }
		          }
		        }
		      }
		    }
		  }
		  resolve()
	  })
	})
	console.debug('done addings filler')
}

module.exports = addFiller