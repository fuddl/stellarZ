import Preact from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks';
import BareMinimum2d from 'bare-minimum-2d'
import { systemScene, plugins } from './systemScene.tsx'
import catalog from './catalog.json'

const zoomDuration = 100;
const zoomSpeed = 16;

const minCamOffset = 1;
const maxCamOffset = 5;

const minCamZoom = 1;
const maxCamZoom = 15;

const minZoom = .5;
const maxZoom = 10;

function searchObjectForId(obj, targetId) {
  for (const key in obj) {
    if (obj[key].id === targetId) {
      return [ obj[key] ]
    }
  }
}

function System({id, height}) {
  const [targetZoom, setTargetZoom] = useState(1);
  const [zoom, setZoom] = useState(20);
  const [zoomStep, setZoomStep] = useState(0);
  const [easing, setEasing] = useState(false);
  const [cubeRx, setCubeRx] = useState(-40);

  const stage = useRef(null);

  useEffect(() => {
      setZoomStep((targetZoom - zoom) / Math.ceil(zoomDuration / zoomSpeed));
    },
    [targetZoom]
  );

  const updateScroll = () => {
    const scrollTop = stage.current.offsetTop
    const scrollBottom = stage.current.offsetTop + stage.current.offsetHeight
    
    const windowTop = window.scrollY
    const windowBottom = window.scrollY + window.innerHeight

    if (windowBottom > scrollTop && windowTop < scrollBottom) {
      setCubeRx((((windowBottom - scrollTop) / window.innerHeight)-1) * 150)
    }
    //
  }

  useEffect(() => {
    window.addEventListener('scroll', updateScroll );

    return function cleanup() {
      window.removeEventListener('scroll', updateScroll );
    } 
  },[]);

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
  const [cubeRz, setCubeRz] = useState(-40);
  const [flat, setFlat] = useState(false);

  let [day, setDay] = useState(0);

  const nextDay = () => {
    setDay((day) => day + .1);
  };

  useEffect(() => {
    const timerId = setInterval(() => {
      nextDay();
    }, 40);

    return () => clearInterval(timerId);
  }, []);

  const systemData = searchObjectForId(catalog, id)

  const viewSettings = {
    camTx: 0,
    camTy: 0,
    camTz: 0,
    cubeRx: flat ? 0 : cubeRx,
    cubeRy: 0,
    cubeRz: flat ? 0 : cubeRz,
    camZoom: 2,
    defaultCamZoffset: (maxZoom / maxCamOffset) * zoom,
    flat: flat,
    dataXoffset: dataOffset.x,
    dataYoffset: dataOffset.y,
    dataZoffset: dataOffset.z,
    canvasToViewRatio: 300,
    defaultCamOrientation: "z-forward-x-right",
  }

  const data = systemScene(viewSettings, dataOffset, setDataOffset, day, systemData);


  return (
    <div
      ref={stage}
      style={{
        width: '100%',
        height: height,
        cursor: grabbing ? 'grabbing' : 'grab',
        userSelect: !grabbing ? 'initial' : 'none',
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
        setEasing(true); setTargetZoom(zoom + 2)
      }}
    >
      <BareMinimum2d
        container={{
          color: 'black',
          xRange: window.innerWidth,
          yRange: height
        }}
        data={data}
        plugins={plugins}
      />
    </div>
  )
}

export default System
