import Preact from 'preact'
import { useState, useEffect } from 'preact/hooks';
import BareMinimum2d from 'bare-minimum-2d'
import { Scene, plugins } from './scene.tsx'
import Navigator from './navigator.tsx'
import Gradients from './gradients.tsx'

const zoomDuration = 100;
const zoomSpeed = 16;

const windowDimensions = function() {
  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

function App() {
  const [dimensions, setDimensions] = useState(windowDimensions());
  const [targetZoom, setTargetZoom] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [zoomStep, setZoomStep] = useState(0);
  const [easing, setEasing] = useState(false);

  useEffect(() => {
      setZoomStep((targetZoom - zoom) / Math.ceil(zoomDuration / zoomSpeed));
    },
    [targetZoom]
  );

  useEffect(() => {
    window.addEventListener("resize", () => {
      setDimensions(windowDimensions())
    }, false);
  }, []);

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



  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const [dataOffset, setDataOffset] = useState({x: 0, y: 0, z: 0})
  const [cubeRx, setCubeRx] = useState(-40);
  const [cubeRz, setCubeRz] = useState(-40);
  const [flat, setFlat] = useState(true);

  const viewSettings = {
    camTx: 0,
    camTy: 0,
    camTz: 0,
    cubeRx: flat ? 0 : cubeRx,
    cubeRy: 0,
    cubeRz: flat ? 0 : cubeRz,
    camZoom: zoom,
    flat: flat,
    dataXoffset: dataOffset.x,
    dataYoffset: dataOffset.y,
    canvasToViewRatio: 300,
    defaultCamZoffset: 5,
    defaultCamOrientation: "z-forward-x-right",
  }

  const data = Scene(viewSettings, setDataOffset);

  return (
    <div
      style={{
        width: '100%',
        height: window.innerHeight,
        cursor: grabbing ? 'grabbing' : 'grab',
        userSelect: !grabbing ? 'initial' : 'none',
      }}
      onWheel={(e) => {
        e.preventDefault()
        if (e.ctrlKey) {
          let destZoom = zoom +- (e.deltaY/100)
          if (destZoom > 0) {
            setZoom(destZoom)
          }
        }
      }}
      onMouseMove={(e) => {
        if (grabbing) {
          if (!flat) {
            setCubeRx(cubeRx + (e.movementY / 2));
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
        setEasing(true); setTargetZoom(zoom + 2)
      }}
    >
      <BareMinimum2d
        container={{
          color: 'black',
          opacity: 'black',
          xRange: window.innerWidth,
          yRange: window.innerHeight
        }}
        data={data}
        plugins={plugins}
      />
      <aside>
        <button onClick={() => { setEasing(true); setTargetZoom(zoom + 2) }}>+</button>
        <button onClick={() => { setEasing(true); setTargetZoom(Math.max(.1, zoom - 2)) }}>-</button>
        <button onClick={() => { setFlat(!flat) }}>{`${(flat ? '2' : '3')}D`}</button>
      </aside>
      <Navigator flat={flat} coordinates={dataOffset} />
      <Gradients />
    </div>
  )
}

export default App
