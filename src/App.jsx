import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import wikidataStars from './wikidata-stars.json';

const Vertex = function(x, y, z) {
  this.x = parseFloat(x);
  this.y = parseFloat(y);
  this.z = parseFloat(z);
};

const Vertex2D = function(x, y) {
  this.x = parseFloat(x);
  this.y = parseFloat(y);
};

const Cube = function(center, side) {
  // Generate the vertices
  var d = side / 2;

  this.vertices = [
    new Vertex(center.x - d, center.y - d, center.z + d),
    new Vertex(center.x - d, center.y - d, center.z - d),
    new Vertex(center.x + d, center.y - d, center.z - d),
    new Vertex(center.x + d, center.y - d, center.z + d),
    new Vertex(center.x + d, center.y + d, center.z + d),
    new Vertex(center.x + d, center.y + d, center.z - d),
    new Vertex(center.x - d, center.y + d, center.z - d),
    new Vertex(center.x - d, center.y + d, center.z + d)
  ];

  // Generate the faces
  this.faces = [
    [this.vertices[0], this.vertices[1], this.vertices[2], this.vertices[3]],
    [this.vertices[3], this.vertices[2], this.vertices[5], this.vertices[4]],
    [this.vertices[4], this.vertices[5], this.vertices[6], this.vertices[7]],
    [this.vertices[7], this.vertices[6], this.vertices[1], this.vertices[0]],
    [this.vertices[7], this.vertices[0], this.vertices[3], this.vertices[4]],
    [this.vertices[1], this.vertices[6], this.vertices[5], this.vertices[2]]
  ];
};

const Line = function(start, end) {
  this.vertices = [
    new Vertex(start.x, start.y, start.z),
    new Vertex(end.x, end.y, end.z)
  ]
  this.type = 'line'
};

const rotate = function(M, center, theta, phi) {
  // Rotation matrix coefficients
  var ct = Math.cos(theta);
  var st = Math.sin(theta);
  var cp = Math.cos(phi);
  var sp = Math.sin(phi);

  // Rotation
  var x = M.x - center.x;
  var y = M.y - center.y;
  var z = M.z - center.z;

  M.x = ct * x - st * cp * y + st * sp * z + center.x;
  M.y = st * x + ct * cp * y - ct * sp * z + center.y;
  M.z = sp * y + cp * z + center.z;
}


function App() {
  const [theta, setTheta] = useState(0);
  const [perspective, setPerspective] = useState(true);
  const [phi, setPhi] = useState(0);
  const [time, setTime] = useState(Date.now());
  const [cubeX, setCubeX] = useState(1);
  const [cubeY, setCubeY] = useState(80);
  const [cubeZ, setCubeZ] = useState(1);
  const [cubeSize, setCubeSize] = useState(40);
  const [distance, setDistance] = useState(1000);
  const [rotationX, setRotationX] = useState(0);
  
  const [dx, setDx] = useState(640);
  const [dy, setDy] = useState(362.5);

const Marker = function(label, x, y, z, base) {
  this.label = label;
  this.vertices = [
    new Vertex(x, y, z),
    new Vertex(x, y, cubeZ),
  ]
};

  const project = function(M) {
    var d = distance;
    var r = d / M.y;

    if (perspective) {
      return new Vertex2D(r * M.x, r * M.z);
    } else {
      return new Vertex2D(M.x*distance, M.z*distance);
    }
  }

  const cube_center = new Vertex(cubeX, cubeY, cubeZ);
  const cube = new Cube(cube_center, cubeSize);

  const attachedMarker = function(label, wdId) {
    const data = wikidataStars.find( ({ id }) => id == wdId );
    return new Marker(
      label,
      cube_center.x + parseFloat(data.x),
      cube_center.y + parseFloat(data.y),
      cube_center.z + parseFloat(data.z)
    )
  };

  const coreData = wikidataStars.find( ({ id }) => id == 'Q237284' );

  const objects = [
    cube,
    new Marker('Earth', cubeX, cubeY, cubeZ, cubeX),
    //new Marker('Wolf 359', cubeX-7.416, cubeY+2.193, cubeZ+0.993),
    new attachedMarker('Proxima', 'Q2839483'),
    new attachedMarker('Vulcan', 'Q1052822'),
    new attachedMarker('Andoria', 'Q13034'),
    new attachedMarker('Tellar Prime', 'Q249302'),
    new attachedMarker('Kaferia', 'Q15820'),
    new attachedMarker('Galactic Core', 'Q237284'),
    new attachedMarker('Risa', 'Q105836593'),
    new attachedMarker('Terra Nova', 'Q13605'),
    new attachedMarker('Ophiucus III', 'Q1327863'),
    new attachedMarker('P\'Jem', 'Q1062596'),
    new attachedMarker('Sigma Draconis VI', 'Q311489'),
    new attachedMarker('Akaali', 'Q1720188'),
    new attachedMarker('Antares', 'Q12166'),
    new attachedMarker('Deneva Prime', 'Q9017189'),
    new attachedMarker('Coridan', 'Q284907'),
    new attachedMarker('Lorillia', 'Q1367757'),
    //new attachedMarker('Ardana', 'Q1153864'),
    new attachedMarker('Freecloud', 'Q2448989'),
    //new attachedMarker('Akamar', 'Q11144359'),
    new Line({x: cube_center.x + coreData.x, y: cube_center.y + coreData.y, z: cube_center.z + coreData.z}, {x: cube_center.x, y: cube_center.y, z: cube_center.z})
   ];

  objects.map((object, i) => (
    object.vertices.map((verticy, ii) => (
      rotate(objects[i].vertices[ii], cube_center, theta, phi)
    ))
  ))


  return (
    <>
      <form>
        <label>Theta</label>
        <input value={theta} type="number" step={.01} onChange={(e) => { setTheta(e.target.value) }} />
        <label>Phi</label>
        <input value={phi} type="number" step={.01} onChange={(e) => { setPhi(e.target.value) }} />
        <fieldset>
          <button onClick={(e) => {
            e.preventDefault()
            setPhi(0) 
            setTheta(0) 
           }}>Front</button>
          <button onClick={(e) => {
            e.preventDefault()
            setPhi(-1.57) 
            setTheta(0) 
           }}>Top</button>
          <button onClick={(e) => {
            e.preventDefault()
            setPhi(0) 
            setTheta(-1.57) 
           }}>Side</button>
        </fieldset>
        <label>Distance</label>
        <input value={distance} type="number" min={1} max={10000} step={10} onChange={(e) => { setDistance(e.target.value) }} />
        <label>Cube X</label>
        <input value={cubeX} type="number" step={10} onChange={(e) => { setCubeX(e.target.value) }} />
        <label>Cube Y</label>
        <input value={cubeY} type="number" step={10} onChange={(e) => { setCubeY(e.target.value) }} />
        <label>Cube Z</label>
        <input value={cubeZ} type="number"  step={10} onChange={(e) => { setCubeZ(e.target.value) }} />
        <label>Cube Size</label>
        <input value={cubeSize} type="number" step={10} onChange={(e) => { setCubeSize(e.target.value) }} />
        <label>DX</label>
        <input value={dx} type="number"  step={.01} onChange={(e) => { setDx(e.target.value) }} />
        <label>DY</label>
        <input value={dy} type="number" step={.01} onChange={(e) => { setDy(e.target.value) }} />
        <label>Perspective</label>
        <input type="checkbox" checked={perspective} step={.01} onChange={(e) => {
          if (e.target.checked) {
            setDistance(distance * 100 )
          } else {
            setDistance(distance / 100 )
          }
          setPerspective(e.target.checked)
        }} />
      </form>
      <svg height="725" width="1280">
        { objects.map((object, i) => (
          <g key={i}>
            { object.label && function() {
              const point2D = project(object.vertices[0])
              const basePoint2D = project(object.vertices[1])

              return (
                <>
                  <line x1={point2D.x + dx} y1={point2D.y + dy} x2={basePoint2D.x + dx} y2={basePoint2D.y + dy} stroke="#232C3F" />
                  <circle cx={basePoint2D.x + dx} cy={basePoint2D.y + dy} r="2" title={ object.label } fill="#232C3F"/>
                </>
               )
            }() }
          </g>
        )) }
        { objects.map((object, i) => (
          <g key={i}>
            { object.faces && object.faces.map((face, ii) => (
              <polygon
                key={ii}
                points={ face.map(function(point, key) {
                  const {x, y} = project(point)
                  return [x + dx, y + dy].join(',')
                }).join(' ') }
                stroke="currentColor"
                fill="none"
              />
            )) }
            { object.type === 'line' && function() {
              const start = project(object.vertices[0])
              const end = project(object.vertices[1])

              return ( <line x1={start.x + dx} y1={start.y + dy} x2={end.x + dx} y2={end.y + dy} stroke="red" /> )
            }() }
            { object.label && function() {
              const point2D = project(object.vertices[0])
              return (
                <>
                  <circle cx={point2D.x + dx} cy={point2D.y + dy} r="2" title={ object.label } fill="currentColor"/>
                  <text x={point2D.x + dx} y={point2D.y + dy} fill="currentColor">
                    <tspan dy={5} dx={5}>{ object.label }</tspan>
                  </text>
                </>
               )
            }() }

          </g>
        )) }
      </svg>
    </>
  );
}

export default App;
