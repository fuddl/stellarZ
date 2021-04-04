module.exports = equatorial2galactic = function(ra, dec, epoch){
  const d2r = Math.PI/180;
  let OB = 23.4333334*d2r;
      dec *= d2r;
      ra *= d2r;
  let a = 266.416833 + 64.48;
  let d = -29.007806 - 64.40; 
  let l = 121.2; 
  let sdec = Math.sin(dec);
  let cdec = Math.cos(dec);
  let sa = Math.sin(a*d2r);
  let ca = Math.cos(a*d2r)

  let GT = Math.asin(cdec*ca*Math.cos(ra-d*d2r)+sdec*sa);
  let GL = Math.atan((sdec-Math.sin(GT)*sa)/(cdec*Math.sin(ra- d*d2r)*ca))/d2r;
  let TP = sdec-Math.sin(GT)*sa;
  let BT = cdec*Math.sin(ra-d*d2r)*ca;
  if(BT<0) GL=GL+180;
  else {
    if (TP<0) GL=GL+360;
  }
  GL = GL + l;
  if (GL>360) GL = GL - 360;

  let LG=Math.floor(GL);
  let LM=Math.floor((GL - Math.floor(GL)) * 60);
  let LS=((GL -Math.floor(GL)) * 60 - LM) * 60;
  GT=GT/d2r;

  let D = Math.abs(GT);
  if (GT > 0) BG=Math.floor(D);
  else BG=(-1)*Math.floor(D);
  let BM=Math.floor((D - Math.floor(D)) * 60);
  let BS = ((D - Math.floor(D)) * 60 - BM) * 60;
  if (GT<0) {
    BM=-BM;
    BS=-BS;
  }

  return { l: GL, b: GT };
}
