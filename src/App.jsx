import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import wikidataStars from './wikidata-stars.json';
import BareMinimum2d from "./bare-minimum-2d/src/index.jsx"
import renderScene from "@mithi/bare-minimum-3d"
import { DataSpecType } from "@mithi/bare-minimum-3d/lib/cjs/primitive-types"

function App() {

  const [cubeRz, setCubeRz] = useState(0);
  const [cubeRx, setCubeRx] = useState(40);
  const [camZoom, setCamZoom] = useState(4);

  const viewSettings = {
    camTx: 0,
    camTy: -.6,
    camTz: 2,
    cubeRx: cubeRx,
    cubeRy: 0,
    cubeRz: cubeRz,
    camZoom: camZoom,
    canvasToViewRatio: 300,
    defaultCamZoffset: 5,
    defaultCamOrientation: "z-forward-x-left",
  }

  const sceneSettings = {
    cubeRange: 20,
    cubeZoffset: .5,
    dataZoffset: 0,
    paperXrange: 1280,
    paperYrange: 600,
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

  const cubeAxes = {
    intersectionPointColor: "#00FF00",
    intersectionPointSize: 5,
    xColor: "#E91E63",
    yColor: "#03A9F4",
    zColor: "#CDDC39",
    lineSize: 1,
    edgeOpacity: 1.0,
  }

  const sceneOptions = {
    paper: { color: "black", opacity: 1 },
    xyPlane: { color: "#0652DD", opacity: 0.1 },
    sceneEdges: { color: "#607D8B", opacity: 1 },
    crossLines: { color: "#795548", opacity: 1 },
  }

  let points = [{
    label: "Galactic plane",
    id: 'plane',
    type: DataSpecType.points,
    opacity: 1.0,
    color: 'red',
    size: 3,
    x: [0],
    y: [0],
    z: [-66.86206],
  }]

  for (let star of wikidataStars) {
    if (star.location) {
      points.push({
        id: star.name,
        type: DataSpecType.lines,
        opacity: .5,
        color: 'currentColor',
        size: 1,
        x0: [star.location.x],
        y0: [star.location.y],
        z0: [0],
        x1: [star.location.x],
        y1: [star.location.y],
        z1: [star.location.z],
      })
    }
  }

  for (let star of wikidataStars) {
    if (star.location) {
      points.push({
        label: star.name,
        id: star.name,
        type: DataSpecType.points,
        opacity: 1.0,
        color: 'white',
        size: 2,
        x: [star.location.x],
        y: [star.location.y],
        z: [star.location.z],
      })
    }
  }


  const { container, data } = renderScene(
    viewSettings,
    sceneSettings,
    sceneOptions,
    points
  )

  return (
    <>
      <form>
        <label>cubeRx</label>
        <input value={cubeRx} type="number" step={.25} min={-181} max={181} onChange={(e) => {
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
        <input value={cubeRz} type="number" step={.25} min={-181} max={181} onChange={(e) => {
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
        <input value={camZoom} type="number" step={.25} min={0} onChange={(e) => {
          setCamZoom(parseFloat(e.target.value))
        }} />
      </form>
      <BareMinimum2d {...{container, data}} />
    </>
  );
}

export default App;
