import React, { useState, useEffect, useRef } from 'react';
import logo from './logo.svg';
import './App.css';
import catalog from './catalog.json';
import hyg from './catalogHyg.json';
import BareMinimum2d from 'bare-minimum-2d';
import renderScene from './bare-minimum-3d/src/index.ts';
import { DataSpecType } from '@mithi/bare-minimum-3d/lib/cjs/primitive-types';
import tree from 'treeify-js';
import textMarkerPlugin from 'bare-minimum-text-marker';
import quadraticBezier from 'bare-minimum-quadratic-bezier';
import clamp from 'clamp';
import sectors from './sector.jsx';
import lineMaker from './lineMaker.jsx';
import showdown from 'showdown';

const md = new showdown.Converter();

function isClose(number, number2, divergence) {
  return clamp(number, number2 - divergence, number2 + divergence) === number;
}

function drawPlanet(object) {
  let scale = .001;
  let diameterUnscaled = object.diameter ?? 12756;
  let diameter = diameterUnscaled * scale;
  return (
    <svg key={ object.id } width={ diameter } height={ diameter }>
      <circle cx={ diameter / 2 } cy={ diameter / 2 } r={ diameter / 2 } fill="white" />
    </svg>
  )
}

function applyLocationInheritance(object) {
  if (object.location && object.orbits) {
    for (let orbit of object.orbits) {
      if (!orbit.location) {
        orbit = applyLocationInheritance(orbit);
        orbit.location = object.location;
      } else {
        orbit.location = {
          ...object.location,
          ...orbit.location,
        };
      }
    }
  }
  return object;
}

function addParents(item, parents = []) {
  if (item?.orbits) {
    for (let subitem of item.orbits) {
      if (!subitem?.parents) {
        subitem.parents = [];
      }
      subitem.parents = [...parents, item];

      subitem = addParents(subitem, subitem.parents);
    }
  }
  return item;
}

let objects = [];
let systems = [];
for (let item of catalog) {
  let itemWithLocation = applyLocationInheritance(item);
  systems.push(JSON.parse(JSON.stringify(itemWithLocation)));
  itemWithLocation = addParents(itemWithLocation);
  objects.push(itemWithLocation);
}

tree.untreeify(objects, 'orbits');

let zoomTimeout;

const baseGridGeometry = (min, max, step) => {
  let x = [];
  let y = [];
  let ymin = [];
  let ymax = [];
  let xmin = [];
  let xmax = [];
  let z = [];
  for (let i = min; i <= max; i += step) {
    x.push(i);
    y.push(i);
    ymin.push(min);
    xmin.push(min);
    ymax.push(max);
    xmax.push(max);
    z.push(0);
  }
  return {
    x0: [...x, ...xmin],
    y0: [...ymax, ...y],
    x1: [...x, ...xmax],
    y1: [...ymin, ...y],
    z0: [...z, ...z],
    z1: [...z, ...z],
  };
};

function App() {
  const [cubeRz, setCubeRz] = useState(0);
  const [cubeRx, setCubeRx] = useState(-40);
  const [camTx, setCamTx] = useState(0);
  const [camTy, setCamTy] = useState(-0.6);
  const [camTz, setCamTz] = useState(17);
  const [mouseGrabX, setMouseGrabX] = useState(false);
  const [mouseGrabY, setMouseGrabY] = useState(false);
  const [dataXoffset, setDataXoffset] = useState(0);
  const dataXoffsetRef = useRef(dataXoffset);
  const [dataYoffset, setDataYoffset] = useState(0);
  const dataYoffsetRef = useRef(dataYoffset);
  const [dataZoffset, setDataZoffset] = useState(0.5);
  const dataZoffsetRef = useRef(dataZoffset);
  const [camZoom, setCamZoom] = useState(4);
  const [flatMode, setFlatMode] = useState(true);
  const [zooming, setZooming] = useState(false);
  const [lineMode, setLineMode] = useState('lines');
  const [courseStart, setCourseStart] = useState(1);
  const [courseDest, setCourseDest] = useState(61);

  const points = [];
  let currentCourse = [];
  if (courseStart != -1 && courseDest != -1) {
    currentCourse = lineMaker(
      objects,
      'federation founding member',
      {
        'federation member': 0,
        'earth colony': 0,
        'federation colony': 0,
        'federation shipyard': 0,
        'federation starbase': 5,
      },
      {
        'federation outpost': 0,
        'deep space station': 0,
      },
      4,
      {
        color: '#98A0B5',
        size: 5,
      },
      'bezier',
      courseStart,
      courseDest,
    );
  }

  const [focus, setFocus] = useState(0);
  let focussedObject = null;

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
    defaultCamOrientation: 'z-forward-x-right',
  };

  const sceneSettings = {
    cubeRange: 20,
    cubeZoffset: 0.5,
    dataXoffset: dataXoffset,
    dataYoffset: dataYoffset,
    dataZoffset: dataZoffset,
    sceneRange: 20,
    paperXrange: window.innerWidth,
    paperYrange: window.innerHeight,
  };

  const edgeAxes = {
    intersectionPointColor: '#FF00FF',
    intersectionPointSize: 5,
    xColor: '#E91E63',
    yColor: '#03A9F4',
    zColor: 'currentColor',
    lineSize: 1,
    edgeOpacity: 1.0,
  };

  const worldAxes = {
    intersectionPointColor: '#FFFF00',
    intersectionPointSize: 5,
    xColor: '#E91E63',
    yColor: '#03A9F4',
    zColor: '#CDDC39',
    lineSize: 1,
    edgeOpacity: 1.0,
  };

  const cubeAxes = {};

  const sceneOptions = {
    paper: false,
    xyPlane: false,
    crossLines: false,
  };

  if (flatMode) {
    for (let object of points) {
      if (object.type === 'lines') {
        object.z0 = [0];
        object.z1 = [0];
      }
    }
  }
  let hygPoints = [];

  const handleNavigation = (e) => {
    switch (e.key) {
      case 'w':
        dataYoffsetRef.current = dataYoffsetRef.current - 0.1;
        setDataYoffset(dataYoffsetRef.current);
        break;
      case 's':
        dataYoffsetRef.current = dataYoffsetRef.current + 0.1;
        setDataYoffset(dataYoffsetRef.current);
        break;
      case 'a':
        dataXoffsetRef.current = dataXoffsetRef.current + 0.1;
        setDataXoffset(dataXoffsetRef.current);
        break;
      case 'd':
        dataXoffsetRef.current = dataXoffsetRef.current - 0.1;
        setDataXoffset(dataXoffsetRef.current);
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleNavigation);

    return () => {
      document.removeEventListener('keydown', handleNavigation);
    };
  }, []);

  let sectorGrid = new sectors(-25, 7, 66.86205783298755, 20);
  for (let object of objects) {
    if (object?.id === focus) {
      focussedObject = object;
      // points.push(
      //   ...sectorGrid.getGeometry(
      //     object.location.x,
      //     object.location.y,
      //     object.location.z,
      //   ),
      // );
    }
  }

  for (let object of objects) {
    if (object.location && object?.tags?.includes('federation member')) {
      points.push({
        id: object.name + '-federtion',
        type: DataSpecType.points,
        opacity: 0.5,
        color: 'url(#fed)',
        size: 60,
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      });
    }
  }

  if (false) {  
    const dmaGridSize = 26;
    const dmaGridStartX = -50;
    const dmaGridStartY = -52;
    const dmaGridZ = flatMode ? 0 : -17.358;
    const dmaGridDividers = 5;
    const dmaGridHeight = flatMode ? 0 : 1;
    for (var ii = 0; ii < dmaGridHeight + 1; ii++) {
      for (var i = 0; i < dmaGridDividers + 1; i++) {
        const z = flatMode ? 0 : dmaGridZ + (dmaGridSize * ii);
        const x = {
          x0: [dmaGridStartX + (dmaGridSize * i)],
          y0: [dmaGridStartY],
          z0: [z],
          x1: [dmaGridStartX + (dmaGridSize * i)],
          y1: [dmaGridSize * dmaGridDividers + dmaGridStartY],
          z1: [z],
        }
        const y = {
          x0: [dmaGridStartX],
          y0: [dmaGridStartY + (dmaGridSize * i)],
          z0: [z],
          x1: [dmaGridSize * dmaGridDividers + dmaGridStartX],
          y1: [dmaGridStartY + (dmaGridSize * i)],
          z1: [z],
        }
        points.push({
          id: ii + i + '-x-dma-grid',
          type: 'lines',
          opacity: 0.5,
          color: '#98A0B5',
          size: 1,
          ...x,
        });
        points.push({
          id: ii + i + '-y-dma-grid',
          type: 'lines',
          opacity: 0.5,
          color: '#98A0B5',
          size: 1,
          ...y,
        });
      } 
    } 
  }

  for (let object of objects) {
    if (
      object.location &&
      (object?.tags?.includes('earth colony') ||
        object?.tags?.includes('federation colony') ||
        object?.tags?.includes('federation outpost') ||
        object?.tags?.includes('federation starbase'))
    ) {
      points.push({
        id: object.name + '-earth',
        type: DataSpecType.points,
        opacity: 0.5,
        color: 'url(#fed)',
        size: 30,
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      });
    }
  }

  for (let object of objects) {
    if (
      object.location &&
      (object?.tags?.includes('claimed by klingon empire') ||
        object?.tags?.includes('klingon outpost'))
    ) {
      points.push({
        id: object.name + '-klingon',
        type: DataSpecType.points,
        opacity: 0.5,
        color: 'url(#kling)',
        size: 60,
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      });
    }
  }

  for (let object of objects) {
    if (
      object.location &&
      object?.tags?.includes('claimed by romulan empire')
    ) {
      points.push({
        id: object.name + '-romulan',
        type: DataSpecType.points,
        opacity: 0.5,
        color: 'url(#romul)',
        size: 60,
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      });
    }
  }

  for (let object of objects) {
    if (object.location  && object?.tags?.includes('notable')) {
      let isBase =
        object?.tags?.includes('federation starbase') ||
        object?.tags?.includes('deep space station');
      let baseFontSize = isBase ? 9 : 16;
      let highlightedFontSize = isBase ? 16 : 19.2;
      points.push({
        label: object.name,
        id: object.name,
        pointer: isBase ? '▵' : '•',
        type: 'textMarker',
        size: object.id === focus ? highlightedFontSize : baseFontSize,
        color: 'white',
        attributes: {
          style: { cursor: 'pointer' },
          onClick: () => {
            setFocus(object.id);
            let sectorCenter = sectorGrid.getCenter(
              object.location.x,
              object.location.y,
              object.location.z,
            );
            setDataXoffset((sectorCenter.x / 20) * -1);
            setDataYoffset((sectorCenter.y / 20) * -1);
            setDataZoffset((sectorCenter.z / 20) * -1);
          },
        },
        layouts: isBase ? ['south', 'north'] : ['east', 'west'],
        x: [object.location.x],
        y: [object.location.y],
        z: flatMode ? [0] : [object.location.z],
      });
    }
  }

  points.push(...currentCourse);
  const { container, data } = renderScene(
    viewSettings,
    sceneSettings,
    sceneOptions,
    [...points, ...hygPoints],
  );

  let focussedSystem = {};
  if (focussedObject) {
    focussedSystem = systems.find(item => item.id == (focussedObject?.parents?.[0]?.id ?? focussedObject.id));
  }

  return (
    <div>
      <form>
        <label>cubeRx</label>
        <input
          value={cubeRx}
          type="number"
          disabled={flatMode}
          min={-181}
          max={181}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v > 180) {
              setCubeRx(-180);
            } else if (v < -181) {
              setCubeRx(180);
            } else {
              setCubeRx(v);
            }
          }}
        />
        <label>cubeRz</label>
        <input
          value={cubeRz}
          type="number"
          disabled={flatMode}
          min={-181}
          max={181}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v > 180) {
              setCubeRz(-180);
            } else if (v < -181) {
              setCubeRz(180);
            } else {
              setCubeRz(v);
            }
          }}
        />
        <label>camZoom</label>
        <input
          value={camZoom}
          type="number"
          step={0.1}
          min={0}
          onChange={(e) => {
            setCamZoom(parseFloat(e.target.value));
          }}
        />
        <label>camTx</label>
        <input
          value={camTx}
          type="number"
          step={0.1}
          onChange={(e) => {
            setCamTx(parseFloat(e.target.value));
          }}
        />
        <label>camTy</label>
        <input
          value={camTy}
          type="number"
          step={0.1}
          onChange={(e) => {
            setCamTy(parseFloat(e.target.value));
          }}
        />
        <label>camTz</label>
        <input
          value={camTz}
          type="number"
          step={0.1}
          onChange={(e) => {
            setCamTz(parseFloat(e.target.value));
          }}
        />
        <label>dataXoffset</label>
        <input
          value={dataXoffset}
          type="number"
          step={0.05}
          onChange={(e) => {
            setDataXoffset(parseFloat(e.target.value));
          }}
        />
        <label>dataYoffset</label>
        <input
          value={dataYoffset}
          type="number"
          step={0.05}
          onChange={(e) => {
            setDataYoffset(parseFloat(e.target.value));
          }}
        />
        <label>dataZoffset</label>
        <input
          value={dataZoffset}
          type="number"
          step={0.05}
          onChange={(e) => {
            setDataZoffset(parseFloat(e.target.value));
          }}
        />
        <label>flatMode</label>
        <input
          value={flatMode}
          type="checkbox"
          step={0.25}
          min={0}
          checked={flatMode}
          onChange={(e) => {
            setFlatMode(e.target.checked);
          }}
        />
      </form>
      <div
        onMouseMove={(e) => {
          if (mouseGrabX && mouseGrabY) {
            if (!flatMode) {
              const yDiff = (mouseGrabY - e.clientY) / 20;
              const xDiff = (mouseGrabX - e.clientX) / 20;
              setCubeRx(cubeRx - yDiff);
              setCubeRz(cubeRz - xDiff);
            } else {
              const xDiff = (mouseGrabX - e.clientX) / 1000;
              const yDiff = (mouseGrabY - e.clientY) / 1000;
              setDataXoffset(dataXoffset - xDiff);
              setDataYoffset(dataYoffset + yDiff);
            }
          }
        }}
        onWheel={(e) => {
          const destZoom = camTz + event.deltaY / 300;
          if (destZoom > 0) {
            setCamTz(destZoom);
            setZooming(true);
          }
          if (zoomTimeout) {
            clearTimeout(zoomTimeout);
          }
          zoomTimeout = setTimeout(function () {
            setZooming(false);
          }, 100);
        }}
        style={{
          cursor: !mouseGrabX ? 'grab' : 'grabbing',
          userSelect: mouseGrabX ? 'none' : null,
        }}
        onMouseDown={(e) => {
          setMouseGrabX(e.clientX);
          setMouseGrabY(e.clientY);
        }}
        onMouseUp={(e) => {
          setMouseGrabX(false);
        }}
      >
        <BareMinimum2d
          {...{ container, data }}
          plugins={[textMarkerPlugin, quadraticBezier]}
        />
      </div>
      <svg hidden="hidden">
        <radialGradient id="fed">
          <stop offset="0%" stopColor="#98A0B5" stopOpacity=".75" />
          <stop offset="100%" stopColor="#98A0B5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="kling">
          <stop offset="0%" stopColor="#E51301" stopOpacity=".75" />
          <stop offset="100%" stopColor="#E51301" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="romul">
          <stop offset="0%" stopColor="#235645" stopOpacity=".75" />
          <stop offset="100%" stopColor="#235645" stopOpacity="0" />
        </radialGradient>
      </svg>
      {focussedObject && (
        <div
          dataId={focussedObject.id}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            margin: '1em 2em',
            maxWidth: '30vw',
            maxHeight: '100vh',
            overflow: 'auto',
            background: '#000000cc',
          }}
        > 
          { focussedSystem?.name && (
            <div>{focussedSystem?.name}</div>
          )}
          <h1>{focussedObject?.name}</h1>
          { focussedSystem?.orbits && (
            <div style={{overflow: 'auto'}}>
              <table>
                <tr>
                  { focussedSystem.orbits.map(object => (
                      <td style={{textAlign:'center'}}>{ drawPlanet(object) }</td>
                  )) }
                </tr> 
                <tr>
                  { focussedSystem.orbits.map(object => (
                    <th style={{whiteSpace:'nowrap', padding: '1em', fontSize: '.5em'}}>{ object.name }</th>
                  )) }
                </tr>
              </table>
            </div>
          ) }
          <button onClick={() => { setCourseDest(focussedObject.id) }}>{'Plot a course'}</button>
        </div>
      )}
    </div>
  );
}

export default App;
