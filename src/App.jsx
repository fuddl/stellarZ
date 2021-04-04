import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import catalog from './catalog.json';
import BareMinimum2d from "bare-minimum-2d"
import renderScene from "./bare-minimum-3d/src/index.ts"
import { DataSpecType } from "@mithi/bare-minimum-3d/lib/cjs/primitive-types"
import tree from "treeify-js"
import textMarkerPlugin from 'bare-minimum-text-marker'
import sector from './sector.jsx'

const Triangle = ({ x, y, transforms, size, color, opacity, id, i }) => {
  const cx = transforms.tx(x)
  const cy = transforms.ty(y)
  const ySize = size * .8626
  return (
    <polygon
      {...{
        opacity,
        id: `${id}-${i}`,
        fill: color
      }}
      points={[
        `${cx},${cy - ySize}`,
        `${cx + size},${cy + ySize}`,
        `${cx - size},${cy + ySize}`
      ].join(' ')}
    />
  )
}

const trianglesPlugin = {
  triangles: (element, transforms) => {
    const { size, color, opacity, id } = element
    return element.x.map((x, i) => (
      <Triangle
        {...{
          x,
          y: element.y[i],
          size,
          color,
          opacity,
          id,
          i,
          transforms
        }}
        key={`${id}-${i}`}
      />
    ))
  }
}

function applyLocationInheritance(object) {
  if (object.location && object.orbits) {
    for (let orbit of object.orbits) {
      if (!orbit.location) {
        orbit = applyLocationInheritance(orbit)
        orbit.location = object.location
      }
    }
  }
  return object
}

let objects = []
for (let item of catalog) {
  objects.push(applyLocationInheritance(item))
}

tree.untreeify(objects, 'orbits')

let fedpoints = [];

for (let object of objects) {
  if (object.location && (object?.tags?.includes('federation member') || object?.tags?.includes('federation outpost') || object?.tags?.includes('earth colony') || object?.tags?.includes('federation colony') || object?.tags?.includes('federation starbase'))) {
    fedpoints.push({
      name: object.name,
      x: [object.location.x],
      y: [object.location.y],
      z: [object.location.z],
    })
  }
}

let klingpoints = [];

for (let object of objects) {
  if (object.location && (object?.tags?.includes('claimed by klingon empire'))) {
    klingpoints.push({
      name: object.name,
      x: [object.location.x],
      y: [object.location.y],
      z: [object.location.z],
    })
  }
}

let zoomTimeout

const baseGridGeometry = (min, max, step) => {
  let x = []
  let y = []
  let ymin = []
  let ymax = []
  let xmin = []
  let xmax = []
  let z = []
  for (let i = min; i <= max; i += step) {
    x.push(i)
    y.push(i)
    ymin.push(min)
    xmin.push(min)
    ymax.push(max)
    xmax.push(max)
    z.push(0)
  }
  return {
    x0: [...x, ...xmin],
    y0: [...ymax, ...y],
    x1: [...x, ...xmax],
    y1: [...ymin, ...y],
    z0: [...z, ...z],
    z1: [...z, ...z],
  }
}


function App() {

  const [cubeRz, setCubeRz] = useState(0);
  const [cubeRx, setCubeRx] = useState(-40);
  const [camTx, setCamTx] = useState(0);
  const [camTy, setCamTy] = useState(-.6);
  const [camTz, setCamTz] = useState(.6);
  const [mouseGrabX, setMouseGrabX] = useState(false)
  const [mouseGrabY, setMouseGrabY] = useState(false)
  const [dataXoffset, setDataXoffset] = useState(0);
  const [dataYoffset, setDataYoffset] = useState(0);
  const [dataZoffset, setDataZoffset] = useState(.5);
  const [camZoom, setCamZoom] = useState(4);
  const [flatMode, setFlatMode] = useState(false);
  const [zooming, setZooming] = useState(false);

  const viewSettings = {
    camTx: camTx,
    camTy: camTy,
    camTz: camTz,
    cubeRx: flatMode ? 0 : cubeRx,
    cubeRy: 0,
    cubeRz: flatMode ? 0 : cubeRz,
    camZoom: camZoom,
    canvasToViewRatio: 300,
    defaultCamZoffset: 5,
    defaultCamOrientation: "z-forward-x-right",
  }

  const sceneSettings = {
    cubeRange: 20,
    cubeZoffset: .5,
    dataXoffset: dataXoffset,
    dataYoffset: dataYoffset,
    dataZoffset: dataZoffset,
    paperXrange: window.innerWidth,
    paperYrange: window.innerHeight,
  }

  const edgeAxes = {
    intersectionPointColor: "#FF00FF",
    intersectionPointSize: 5,
    xColor: "#E91E63",
    yColor: "#03A9F4",
    zColor: "currentColor",
    lineSize: 1,
    edgeOpacity: 1.0,
  }

  const worldAxes = {
    intersectionPointColor: "#FFFF00",
    intersectionPointSize: 5,
    xColor: "#E91E63",
    yColor: "#03A9F4",
    zColor: "#CDDC39",
    lineSize: 1,
    edgeOpacity: 1.0,
  }

  const cubeAxes = {}

  const sceneOptions = {
    paper: false,
    xyPlane: false,
    //sceneEdges: flatMode ? false : { color: "#607D8B", opacity: 1 },
    crossLines: false,
  }

  let points = []

  let sectorIds = []
  let sectorSize = 20

  for (let object of objects) {
    if (object.location && object?.tags?.includes('notable')) {
      let sectorX = Math.floor(object.location.x/sectorSize)*sectorSize
      let sectorY = Math.floor(object.location.y/sectorSize)*sectorSize
      let sectorZ = Math.floor(object.location.z/sectorSize)*sectorSize
      let thisId = [sectorY, sectorY, sectorZ].join('|')
      if (!sectorIds.includes(thisId)) {
        sectorIds.push(thisId)
        points.push(
          ...sector(
            sectorX,sectorY,sectorZ
          )
        )
      }
    }
  }

  console.debug(sectorIds)

  if (flatMode) {
    const grid = {
      id: 'base-grid',
      type: DataSpecType.lines,
      opacity: .5,
      color: 'red',
      size: 1,
      ...baseGridGeometry(-220, 220, 20),
    }
    points.push(grid)
  }

let fedLines = []
  for (let fedpoint0 of fedpoints) {
    let shortest = false;
    let line = {}
    for (let fedpoint1 of fedpoints) {
      let id = [fedpoint0.name, fedpoint1.name].sort().join('→')
      if (fedpoints.find(e => e.id === id) === undefined) {
        if (fedpoint0 !== fedpoint1) {
          let deltas = {
            x: fedpoint1.x - fedpoint0.x,
            y: fedpoint1.y - fedpoint0.y,
            z: fedpoint1.z - fedpoint0.z,
          }
          let distance = Math.sqrt(deltas.x * deltas.x + deltas.y * deltas.y + deltas.z * deltas.z)
          if (!shortest || (distance < shortest && fedLines.find(e => e.id === id) === undefined)) {
            shortest = distance
            line = {
              id: id,
              "x0": [fedpoint0.x],
              "y0": [fedpoint0.y],
              "z0": flatMode ? [0] : [fedpoint0.z],
              "x1": [fedpoint1.x],
              "y1": [fedpoint1.y],
              "z1": flatMode ? [0] : [fedpoint1.z],        
            }
          }
        }
      }
    }
    fedLines.push(line)
  }
  for (let line of fedLines) {
    points.push({
      id: 'line',
      type: DataSpecType.lines,
      opacity: .5,
      color: '#98A0B5',
      size: 2,
      ...line,
    })
  }
  let klingLines = []
  for (let fedpoint0 of klingpoints) {
    let shortest = false;
    let line = {}
    for (let fedpoint1 of klingpoints) {
      let id = [fedpoint0.name, fedpoint1.name].sort().join('→')
      if (klingpoints.find(e => e.id === id) === undefined) {
        if (fedpoint0 !== fedpoint1) {
          let deltas = {
            x: fedpoint1.x - fedpoint0.x,
            y: fedpoint1.y - fedpoint0.y,
            z: fedpoint1.z - fedpoint0.z,
          }
          let distance = Math.sqrt(deltas.x * deltas.x + deltas.y * deltas.y + deltas.z * deltas.z)
          if (!shortest || (distance < shortest && klingLines.find(e => e.id === id) === undefined)) {
            shortest = distance
            line = {
              id: id,
              "x0": [fedpoint0.x],
              "y0": [fedpoint0.y],
              "z0": flatMode ? [0] : [fedpoint0.z],
              "x1": [fedpoint1.x],
              "y1": [fedpoint1.y],
              "z1": flatMode ? [0] : [fedpoint1.z],        
            }
          }
        }
      }
    }
    klingLines.push(line)
  }
  console.debug(klingLines)
  for (let line of klingLines) {
    points.push({
      id: 'line',
      type: DataSpecType.lines,
      opacity: .5,
      color: '#E51301',
      size: 2,
      ...line,
    })
  }

  for (let object of objects) {
    if (object.location && object?.tags?.includes('federation member')) {
      points.push({
        id: object.name + '-federtion',
        type: DataSpecType.points,
        opacity: .5,
        color: 'url(#fed)',
        size: 60,
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      })
    }
  }

  for (let object of objects) {
    if (object.location && (object?.tags?.includes('earth colony') || object?.tags?.includes('federtion colony') || object?.tags?.includes('federation outpost') || object?.tags?.includes('federation starbase'))) {
      points.push({
        id: object.name + '-earth',
        type: DataSpecType.points,
        opacity: .5,
        color: 'url(#fed)',
        size: 30,
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      })
    }
  }

  for (let object of objects) {
    if (object.location && object?.tags?.includes('claimed by klingon empire')) {
      points.push({
        id: object.name + '-klingon',
        type: DataSpecType.points,
        opacity: .5,
        color: 'url(#kling)',
        size: 60,
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      })
    }
  }




  // for (let object of objects) {
  //   if (object.location && object?.tags?.includes('notable')) {
  //     points.push({
  //       id: object.name + '-leg',
  //       type: DataSpecType.lines,
  //       opacity: .5,
  //       color: 'currentColor',
  //       size: 1,
  //       x0: [object.location.x],
  //       y0: [object.location.y],
  //       z0: [-66.86205783298755],
  //       x1: [object.location.x],
  //       y1: [object.location.y],
  //       z1: flatMode ? [0] : [object.location.z],
  //     })
  //   }
  // }

  //if (!mouseGrabX && !zooming) {
    for (let object of objects) {
      if (object.location && object?.tags?.includes('notable')) {
        let isBase = object?.tags?.includes('federation starbase') || object?.tags?.includes('deep space station')
        points.push({
          label: object.name,
          id: object.name,
          pointer: isBase ? '▵' : '•',
          type: 'textMarker',
          opacity: 1.0,
          color: 'white',
          size: isBase ? 9 : 16,
          layouts: isBase ? ['south', 'north'] : ['east', 'west'],
          x: [object.location.x],
          y: [object.location.y],
          z: flatMode ? [0] : [object.location.z],
        })
      }
    }
  //}

  const { container, data } = renderScene(
    viewSettings,
    sceneSettings,
    sceneOptions,
    points,
    [trianglesPlugin]
  )

  return (
    <div
      onMouseMove={(e) => {
        if (mouseGrabX && mouseGrabY) {
          const yDiff = (mouseGrabY-e.clientY)/20
          setCubeRx(cubeRx-yDiff)
          const xDiff = (mouseGrabX-e.clientX)/20
          setCubeRz(cubeRz-xDiff)
        }
      }}
      onWheel={(e) => {
        const destZoom = camTz + (event.deltaY/300)
        if (destZoom > 0) {
          setCamTz(destZoom)
          setZooming(true)
        }
        if(zoomTimeout){
          clearTimeout(zoomTimeout);  
        }
        zoomTimeout = setTimeout(function(){
          setZooming(false)
        }, 100)
      }}
      style={{
        cursor: !mouseGrabX ? 'grab' : 'grabbing',
        userSelect: mouseGrabX ? 'none' : null,
      }}
      onMouseDown={(e) => {
        setMouseGrabX(e.clientX)
        setMouseGrabY(e.clientY)
      }}
      onMouseUp={(e) => {
        setMouseGrabX(false)
      }}
    >
      <form>
        <label>cubeRx</label>
        <input value={cubeRx} type="number" disabled={flatMode} min={-181} max={181} onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (v > 180) {
            setCubeRx(-180)
          } else if (v < -181) {
            setCubeRx(180)
          } else {
            setCubeRx(v)
          }
        }} />
        <label>cubeRz</label>
        <input value={cubeRz} type="number" disabled={flatMode} min={-181} max={181} onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (v > 180) {
            setCubeRz(-180)
          } else if (v < -181) {
            setCubeRz(180)
          } else {
            setCubeRz(v)
          }
        }} />
        <label>camZoom</label>
        <input value={camZoom} type="number" step={.1} min={0} onChange={(e) => {
          setCamZoom(parseFloat(e.target.value))
        }} />
        <label>camTx</label>
        <input value={camTx} type="number" step={.1} onChange={(e) => {
          setCamTx(parseFloat(e.target.value))
        }} />
        <label>camTy</label>
        <input value={camTy} type="number" step={.1} onChange={(e) => {
          setCamTy(parseFloat(e.target.value))
        }} />
        <label>camTz</label>
        <input value={camTz} type="number" step={.1} onChange={(e) => {
          setCamTz(parseFloat(e.target.value))
        }} />
        <label>dataXoffset</label>
        <input value={dataXoffset} type="number" step={.05} onChange={(e) => {
          setDataXoffset(parseFloat(e.target.value))
        }} />
        <label>dataYoffset</label>
        <input value={dataYoffset} type="number" step={.05} onChange={(e) => {
          setDataYoffset(parseFloat(e.target.value))
        }} />
        <label>dataZoffset</label>
        <input value={dataZoffset} type="number" step={.05} onChange={(e) => {
          setDataZoffset(parseFloat(e.target.value))
        }} />
        <label>flatMode</label>
        <input value={flatMode} type="checkbox" step={.25} min={0} onChange={(e) => {
          setFlatMode(e.target.checked)
        }} />
      </form>
      <BareMinimum2d {...{container, data}} plugins={[trianglesPlugin, textMarkerPlugin]} />
      <svg hidden="hidden">
        <radialGradient id="fed">
          <stop offset="0%"   stopColor="#98A0B5" stopOpacity=".75" />
          <stop offset="100%" stopColor="#98A0B5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="kling">
          <stop offset="0%"   stopColor="#E51301" stopOpacity=".75" />
          <stop offset="100%" stopColor="#E51301" stopOpacity="0" />
        </radialGradient>
      </svg>
    </div>
  );
}

export default App;
