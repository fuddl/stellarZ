const WBK = require('wikibase-sdk');
const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
});
const fetch = require('node-fetch');
const fs = require('fs');
const galactic = require('galactic');

const url = wdk.sparqlQuery(
  `
    SELECT ?parent ?parentLabel ?objectLabel ?right_ascension ?distance ?distanceUnit ?declination ?s WHERE {
    SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    { ?object wdt:P31 wd:Q57083319;
        wdt:P397* ?parent.
    } UNION {
      ?parent wdt:P361 wd:Q649112
    }
    OPTIONAL { ?parent wdt:P6257 ?right_ascension. }
    OPTIONAL { ?parent wdt:P6258 ?declination. }
    ?parent p:P2583/psv:P2583 ?distance_from_Earth.
    ?distance_from_Earth wikibase:quantityAmount ?distance.
    ?distance_from_Earth wikibase:quantityUnit ?distanceUnit.
  }
  `
);

function degrees2radiants(degrees) {
  return degrees * (Math.PI/180);
}

function equatorial2galactic(ra, dec, epoch){
  const d2r = Math.PI/180;
  var OB = 23.4333334*d2r;
      dec *= d2r;
      ra *= d2r;
  var a = 266.416833 + 64.57535;  // The RA of the North Galactic Pole
  var d = -29.007806 - 64.57535; // The declination of the North Galactic Pole
  var l = 125;  // The ascending node of the Galactic plane on the equator
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
    z: (c * Math.cos(l)) * Math.sin(b),
  }
}

(async () => {
  const result = await fetch(url);
  const json = await result.json();
  const objects = wdk.simplify.sparqlResults(json);
  let output = []
  for (let object of objects) {
    if (object?.declination && object?.right_ascension && object.distance?.value) {
      console.log('importing ' + object?.parent?.label);
      output.push({
        id: object?.parent?.value,
        label: object?.parent?.label,
        ...sperical2cartesian(
          object.declination,
          object.right_ascension,
          object.distance?.value,
          object.distance?.unit.endsWith('Q12129'),
        )
      })
    } 
  }
  fs.writeFile('./src/wikidata-stars.json', JSON.stringify(output, null, '  '), 'utf8', () => {
    console.log('Done')
  });
})()
