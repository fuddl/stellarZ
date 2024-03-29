import Preact from 'preact'
import { useState, useEffect } from 'preact/hooks';
import BareMinimum2d from 'bare-minimum-2d'
import { Scene, plugins } from './scene.tsx'
import Navigator from './navigator.tsx'
import Assets from './assets.tsx'
import parseSVG from 'svg-path-parser'
import catalog from './catalog.json'
import validLocation from './valid-location.js'
import flatten from './flattenCatalog.tsx'
import System from './system.tsx'

const flattenedCatalog = structuredClone(catalog)

flatten(flattenedCatalog)

const renderableCatalog = flattenedCatalog.filter(entry => !validLocation(entry));

const zoomDuration = 100;
const zoomSpeed = 16;

const minCamOffset = 1;
const maxCamOffset = 5;

const minCamZoom = 1;
const maxCamZoom = 15;

const minZoom = .5;
const maxZoom = 10;

const windowDimensions = function(half) {
  return {
    height: half ? window.innerHeight / 2 : window.innerHeight,
    width: window.innerWidth,
  };
}

function App() {
  const [targetZoom, setTargetZoom] = useState(1);
  const [zoom, setZoom] = useState(20);
  const [zoomStep, setZoomStep] = useState(0);
  const [easing, setEasing] = useState(false);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const [dataOffset, setDataOffset] = useState({x: -16 / zoom, y: 142 / zoom, z: 120 / zoom})
  const [cubeRx, setCubeRx] = useState(-40);
  const [cubeRz, setCubeRz] = useState(-40);


  const [ flat, setFlat ] = useState(true)
  const [ autoRotate, setAutoRotate] = useState(true)
  const [ frame, setFrame ] = useState(0)
  const [ system, setSystem ] = useState(0)
  const systemVisible = system > 0
  const [ dimensions, setDimensions ] = useState(windowDimensions(systemVisible));

  const nextFrame = () => {
    setFrame((frame) => frame + 1.2)
  }

  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     if (!flat && !grabbing) {
  //       setCubeRz((cubeRz) => cubeRz - 1)
  //     }
  //     nextFrame()
  //   }, 40)
  //   return () => clearInterval(timer)
  // }, [])

  useEffect(() => {
      setZoomStep((targetZoom - zoom) / Math.ceil(zoomDuration / zoomSpeed));
    },
    [targetZoom]
  );

  useEffect(() => {
    window.addEventListener("resize", () => {
      setDimensions(windowDimensions(system))
    }, false);
  }, []);

  useEffect(() => {
    setDimensions(windowDimensions(system))
  }, [system]);

  useEffect(() => {
      if (easing) {
        if (zoom.toFixed(2) === targetZoom.toFixed(2)) {
          setEasing(false);
          return;
        }
        let t = window.setTimeout(
          () => setZoom(zoom + zoomStep),
          zoomSpeed
        );
        return () => window.clearTimeout(t);
      }
    },
    [targetZoom, zoom, zoomStep]
  );

  const viewSettings = {
    camTx: 0,
    camTy: 0,
    camTz: 0,
    cubeRx: flat ? 0 : cubeRx,
    cubeRy: 0,
    cubeRz: flat ? 0 : cubeRz,
    camZoom: 4,
    defaultCamZoffset: (maxZoom / maxCamOffset) * zoom,
    flat: flat,
    dataXoffset: dataOffset.x,
    dataYoffset: dataOffset.y,
    dataZoffset: dataOffset.z,
    canvasToViewRatio: 300,
    defaultCamOrientation: "z-forward-x-right",
  }

  const data = Scene(viewSettings, dataOffset, setDataOffset, renderableCatalog, setSystem);

  return (
    <div
      style={{
        width: '100%',
        height: window.innerHeight,
      }}
      onWheel={(e) => {
        e.preventDefault()
        if (e.ctrlKey) {
          let destZoom = zoom +- (e.deltaY*-1/100)
          if (destZoom > 0) {
            setZoom(Math.max(minZoom, Math.min(maxZoom, destZoom)))
          }
        }
      }}
      onMouseMove={(e) => {
        if (grabbing) {
          if (!flat) {
            setCubeRx(Math.min(0, Math.max(-180, cubeRx + (e.movementY / 2))));
            setCubeRz(cubeRz + (e.movementX / 2));
          } else {
            setDataOffset({
              x: dataOffset.x + (e.movementX / 100),
              y: dataOffset.y - (e.movementY / 100),
              z: dataOffset.z,
            })
          }
        }
      }}
      onMouseDown={() => {
        setGrabbing(true);
      }}
      onMouseUp={() => {
        setGrabbing(false);
      }}
      onMouseLeave={() => {
        setGrabbing(false);
      }}
      onDoubleClick={()=> {
        setZoom(zoom + 2)
      }}
    >   
      <div style={{
        height: `${dimensions.height}px`,
        cursor: grabbing ? 'grabbing' : 'grab',
        userSelect: !grabbing ? 'initial' : 'none',
        position: 'relative',
      }}>
        <BareMinimum2d
          container={{
            color: 'black',
            opacity: 'black',
            xRange: dimensions.width,
            yRange: dimensions.height,
          }}
          data={data}
          plugins={plugins}
        />
        <aside>
          <button onClick={() => { setZoom(Math.min(maxZoom, zoom - 1)) }}>+</button>
          <button onClick={() => { setZoom(Math.max(minZoom, zoom + 1)) }}>-</button>
          <button onClick={() => { setFlat(!flat) }}>{`${(flat ? '2' : '3')}D`}</button>
          <input type="number" value={zoom} size="2" step=".01" min={minZoom} max={maxZoom} onChange={(e) => { setZoom(Math.max(minZoom, Math.min(maxZoom, e.value))) }} />
        </aside>
      </div>
      { systemVisible ? <System id={ system } height={ window.innerHeight / 2} /> : null }
      <Navigator flat={flat} coordinates={dataOffset} />
      <Assets.Gradients />
    </div>
  )
}

export default App
