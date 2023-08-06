import {
  SCENE_ORIENTATION,
  getWorldWrtCameraMatrix,
  AxesRenderer,
  SceneCube,
  DataRenderer,
  SceneCubeRenderer,
  Vector,
  rotateXYZmatrix,
  multiply4x4matrix,
  radians,
} from "@mithi/bare-minimum-3d"
import tree from 'treeify-js';
import quadraticBezier from './bezier.tsx'
import textMarker from './textMarker.tsx'
import symbol from './symbol.tsx'
import sphere from './sphere.tsx'
import iterator from 'iterate-tree'
import Assets from './assets.tsx'

const zoom = 250
const pi2 = Math.PI * 2

function assignUniqueOrdinals(array) {
  let lastOrdinal = 0;

  array.forEach(item => {
    if (!item.ord) {
      while (array.some(item => item.ord === lastOrdinal)) {
        lastOrdinal++;
      }
      item.ord = lastOrdinal;
      lastOrdinal++;
    }
  });
}


function addAphelion(object, depth) {
  let lastDist = 0
  assignUniqueOrdinals(object)
  for (let key in object) {
    let numberOfOrbits = 0
    if (object[key]?.orbits) {
      addAphelion(object[key].orbits, depth + 1)
      numberOfOrbits = object[key].orbits.length
    }
    if (!object[key]?.aphelion) {
      const moonspace = (numberOfOrbits * .06)
      const pusher = lastDist + moonspace + (.1 / depth)
      lastDist =+ pusher + moonspace

      object[key].aphelion = pusher
    }
  }
}

function addOrbitalOffset(object, parent = {x: 0, y: 0, z: 0}, time) {
  for (let key in object) {
    if (parent) {
      object[key].orbitalPeriod = 1000 - (100 / object[key]?.aphelion)
      if (object[key]?.orbitalPeriod) {
        const progress = pi2 * time / object[key].orbitalPeriod + (object[key]?.orbitalPeriodOffset ?? 0)
        const aphelion = object[key]?.aphelion ? (object[key].aphelion * zoom) : 0

        object[key].location = {
          x: parent.x + aphelion * Math.cos(progress),
          y: parent.y + aphelion * Math.sin(progress),
          z: parent.z,
        }
      } else {
        object[key].location = {
          x: parent.x + object[key].aphelion * zoom,
          y: parent.y,
          z: parent.z,
        }
      }
    }
    object[key].orbitCenter = parent
    if (object[key]?.orbits) {
      addOrbitalOffset(object[key].orbits, object[key].location, time)
    }
  }
}


class ExtendedDataRenderer extends DataRenderer {
  constructor(
    sceneRange: number,
        dataXoffset: number,
        dataYoffset: number,
        dataZoffset: number,
        transformMatrix: matrix4x4,
        projectionConstant: number,
        flat: bool,
        flatOffset: number,
  ) {
    super(sceneRange, dataXoffset, dataYoffset, dataZoffset, transformMatrix, projectionConstant)
    this.flat = flat;
    this.flatOffset = flatOffset;
  }
    _projectPointWithDist(x_: number, y_: number, z_: number, i: number): Vector {
        const {
            sceneRange,
            dataXoffset,
            dataYoffset,
            dataZoffset,
            transformMatrix,
            projectionConstant,
        } = this
        const x = x_ / sceneRange + dataXoffset
        const y = y_ / sceneRange + dataYoffset
        const z = z_ / sceneRange + dataZoffset

     const pointWrtCam = new Vector(x, y, z, `${i}`).transform(transformMatrix)
       let virtualDistanceWrtCam = this.flat ? this.flatOffset : Math.sqrt(pointWrtCam.x**2 + pointWrtCam.y**2 + pointWrtCam.z**2);
       return {
         point2d: pointWrtCam.project(projectionConstant),
         dist: virtualDistanceWrtCam,
       }
    }
  _projectPolygonOrPointsWithDist (element: PolygonOrPoints3d): PolygonOrPoints2d {
        const xs: Array<number> = []
        const ys: Array<number> = []
        const dists: Array<number> = []

        element.x.forEach((rawX: number, index: number) => {
            const point = this._projectPointWithDist(
                rawX,
                element.y[index],
                element.z[index],
                index
            )
            xs.push(point.point2d.x)
            ys.push(point.point2d.y)
            dists.push(point.dist)
        })

        const { z, ...elementWithoutZ } = element
        return { ...elementWithoutZ, x: xs, y: ys, dist: dists }
    }
    _projectLinesWithDist(lines: Lines3dSpecs): Lines2dSpecs {
        const xs0: Array<number> = []
        const ys0: Array<number> = []
        const xs1: Array<number> = []
        const ys1: Array<number> = []
        const dists: Array<number> = []

        lines.x0.forEach((rawX0: number, index: number) => {
            const points0 = this._projectPointWithDist(
                rawX0,
                lines.y0[index],
                lines.z0[index],
                index
            )

            const points1 = this._projectPointWithDist(
                lines.x1[index],
                lines.y1[index],
                lines.z1[index],
                index
            )

            xs0.push(points0.point2d.x)
            ys0.push(points0.point2d.y)
            dists.push(points0.dist)
            xs1.push(points1.point2d.x)
            ys1.push(points1.point2d.y)
            dists.push(points1.dist)
        })


        const { z0, z1, ...linesWithoutZ } = lines
        return { ...linesWithoutZ, x0: xs0, y0: ys0, x1: xs1, y1: ys1, dist: dists }
    }
  render(data) {
    return data.map((element) => {
      switch (element.type) {
        case 'polygon':
        case 'QuadraticBezier':
        case 'textMarker':
        case 'points':
          return this._projectPolygonOrPoints(element);
        case 'lines':
          return this._projectLinesWithDist(element);
        case 'symbol':
        case 'sphere':
          return this._projectPolygonOrPointsWithDist(element);
      }
    });
  }
}

const renderScene = (viewSettings, sceneSettings, sceneOptions, data3d, flat, objects) => {
  const { camTx, camTy, camTz, defaultCamZoffset, defaultCamOrientation } = viewSettings;
  const camPosition = {
    x: camTx,
    y: camTy,
    z: camTz + defaultCamZoffset
  };
  const camOrientation = SCENE_ORIENTATION[defaultCamOrientation];
  const worldWrtCameraMatrix = getWorldWrtCameraMatrix(camPosition, camOrientation);
  const { cubeRx, cubeRy, cubeRz, canvasToViewRatio, camZoom } = viewSettings;
  const { cubeZoffset, cubeRange } = sceneSettings;
  const projectionConstant = canvasToViewRatio * camZoom;
  const cubeOrientation = { x: cubeRx, y: cubeRy, z: cubeRz };
  const cube = new SceneCube(cubeOrientation, worldWrtCameraMatrix, cubeZoffset, cubeRange, projectionConstant);
  const { dataXoffset, dataYoffset, dataZoffset } = sceneSettings;
  const models = new ExtendedDataRenderer(
    cube.range,
    dataXoffset,
    dataYoffset,
    dataZoffset,
    cube.wrtCameraMatrix,
    projectionConstant,
    flat,
    defaultCamZoffset,
  ).render(data3d);
  const container = {
    color: sceneOptions.paper.color,
    opacity: sceneOptions.paper.opacity || 1,
    xRange: sceneSettings.paperXrange,
    yRange: sceneSettings.paperYrange
  };
  if (!flat) {
    models.sort((a, b) => {
      if (a?.dist?.[0] && b?.dist?.[0]) {
        return a.dist[0] > b.dist[0] ? -1 : 1;
      }
      return 0;
    })


    const maxX = sceneSettings.paperXrange / 2
    const minX = maxX * -1
    for (const key in models) {
      if (models[key].type === 'lines') {
        if (
          (
            models[key].x0 <= minX || models[key].x0 >= maxX &&
            models[key].y0 <= 0 || models[key].y0 >= sceneSettings.paperYrange
          ) || (
            models[key].x1 <= minX || models[key].x1 >= maxX &&
            models[key].y1 <= 0 || models[key].y1 >= sceneSettings.paperYrange
          )
        ) {
          models[key].hidden = true;
        }
      }
    }
  }
  return {
    container,
    data: [...models.filter(function (v) {
      return !('hidden' in v)
    })]
  };
};

function circle(center, radius, precision = 42, axis = 'z') {
  const axes = ((axis) => {
    switch (axis) {
    case 'z': 
        return ['x', 'y', 'z']
        break;
    case 'y': 
        return ['z', 'x', 'y']
        break;
    case 'x': 
        return ['y', 'z', 'x']
        break;
    }
  })(axis);

  let points = {
    x: [],
    y: [],
    z: [],
  }

  for (let i = 0; i < Math.PI * 2; i = i + (Math.PI / precision)) {
    points[axes[0]].push(center[axes[0]] + Math.cos(i) * radius);
    points[axes[1]].push(center[axes[1]] + Math.sin(i) * radius);
    points[axes[2]].push(center[axes[2]]);
  }

  return points;
}

function orbit(name, center, radius) {
  return {
    color: 'white',
    size: 1,
    type: 'QuadraticBezier',
    id: `orbit-${name}`,
    closed: true,
    ...circle(center, radius, 79, 'z'),
  }
}

const localSpaceCenter = {x: 0, y: 0, z: 0}

function systemScene(viewSettings, dataOffset, setDataOffset, time, objects) {
  const sceneSettings = {
    cubeRange: 20,
    cubeZoffset: 0,
    dataXoffset: dataOffset.x,
    dataYoffset: dataOffset.y,
    dataZoffset: dataOffset.z,
    paperXrange: window.innerWidth,
    paperYrange: window.innerHeight,
  }

  const emptySceneOptions = {
    paper: { color: "#17212B", opacity: 1 },
    xyPlane: { color: "#0652DD", opacity: 0.1 },
    sceneEdges: { color: "#607D8B", opacity: 1 },
    crossLines: { color: "#795548", opacity: 1 },
  }

  const sceneOptions = {
    paper: true,
    xyPlane: true,
    sceneEdges: { color: "#607D8B", opacity: 1 },
    crossLines: true,
  }


  const points = [];

  addAphelion(objects, 1)
  addOrbitalOffset(objects, null, time)

  iterator.bfs([...objects], 'orbits', (object) => {
    if (object.aphelion && object.orbitCenter) {
      points.push(orbit(`${object.id}`, object.orbitCenter, object.aphelion * zoom));
    }
  })

  let count = -5
  iterator.bfs([...objects], 'orbits', (object) => {
    count--
    points.push({
      label: object.name,
      id: object.id,
      pointer: '⬤',
      type: 'textMarker',
      size: 17,
      gap: 100 * count,
      color: '#3656D8',
      attributes: {
        style: { cursor: 'pointer' },
      },
      sceneSettings: sceneSettings,
      layouts: ['east', 'west', 'north', 'south'],
      x: [object.location.x],
      y: [object.location.y],
      z: viewSettings?.flat ? [0] : [object.location.z],
    });
  });


  const center = {
    x: dataOffset.x * sceneSettings.cubeRange * -1,
    y: dataOffset.y * sceneSettings.cubeRange * -1,
    z: dataOffset.z * sceneSettings.cubeRange * -1,
  }

  let { data } = renderScene(
    viewSettings,
    sceneSettings,
    emptySceneOptions,
    [
      ...points,
    ],
    viewSettings?.flat,
    objects,
  )
  return data;
}

const plugins = [quadraticBezier, textMarker, symbol, sphere]

export {
  systemScene,
  plugins,
}
