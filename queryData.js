const WBK = require('wikibase-sdk');
const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
});
const fetch = require('node-fetch');
const fs = require('fs');

const yaml = require('js-yaml');


function degrees2radiants(degrees) {
  return degrees * (Math.PI/180);
}

function equatorial2galactic(ra, dec, epoch){
  const d2r = Math.PI/180;
  var OB = 23.4333334*d2r;
      dec *= d2r;
      ra *= d2r;
  var a = 266.416833 + 64.48;
  var d = -29.007806 - 64.40; 
  var l = 121.2; 
  var sdec = Math.sin(dec);
  var cdec = Math.cos(dec);
  var sa = Math.sin(a*d2r);
  var ca = Math.cos(a*d2r)

  var GT = Math.asin(cdec*ca*Math.cos(ra-d*d2r)+sdec*sa);
  var GL = Math.atan((sdec-Math.sin(GT)*sa)/(cdec*Math.sin(ra- d*d2r)*ca))/d2r;
  var TP = sdec-Math.sin(GT)*sa;
  var BT = cdec*Math.sin(ra-d*d2r)*ca;
  if(BT<0) GL=GL+180;
  else {
    if (TP<0) GL=GL+360;
  }
  GL = GL + l;
  if (GL>360) GL = GL - 360;

  var LG=Math.floor(GL);
  var LM=Math.floor((GL - Math.floor(GL)) * 60);
  var LS=((GL -Math.floor(GL)) * 60 - LM) * 60;
  var GT=GT/d2r;

  var D = Math.abs(GT);
  if (GT > 0) var BG=Math.floor(D);
  else var BG=(-1)*Math.floor(D);
  var BM=Math.floor((D - Math.floor(D)) * 60);
  var BS = ((D - Math.floor(D)) * 60 - BM) * 60;
  if (GT<0) {
    BM=-BM;
    BS=-BS;
  }

  return { l: GL, b: GT };
}


function sperical2cartesian(declination, right_ascension, distance, distance_is_parsec) {

  const galactic = equatorial2galactic(right_ascension, declination);

  const l = degrees2radiants(galactic.b);
  const b = degrees2radiants(galactic.l);
  //const l = degrees2radiants(right_ascension);
  //const b = degrees2radiants(declination);

  const c = !distance_is_parsec ? distance : distance * 3.261564;
  return {
    x: (c * Math.cos(l)) * Math.cos(b),
    y: c * Math.sin(l),
    z: ((c * Math.cos(l)) * Math.sin(b))*-1,
  }
}

async function addCoordinates(object) {
  if (typeof object.location === 'string' && object.location.startsWith('wd:Q')) {
    console.debug(`aquireing location for ${object.name} from wikidata`)
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
    `
    );
    let headers = new fetch.Headers({
      "Accept"       : "application/json",
      "Content-Type" : "application/json",
      "User-Agent"   : "https://github.com/fuddl/stellarZ"
    });
    const result = await fetch(url, {
      headers: headers,
    });
    const json = await result.json();
    const data = wdk.simplify.sparqlResults(json)[0];
    if (data) {
      object.location = {
        ...sperical2cartesian(
          data.dec,
          data.ra,
          data.dis?.value,
          data.dis?.unit.endsWith('Q12129'),
        )
      }
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
  let output = []
  const raw_data = yaml.load(fs.readFileSync('./src/catalog.yml', 'utf8'));
  for (let object of raw_data) {
    object = await addCoordinates(object);
  }

  fs.writeFile('./src/catalog.json', JSON.stringify(raw_data, null, '  '), 'utf8', () => {
    console.log('Done')
  });
})()
