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
import catalog from './catalog.json'
import validLocation from './valid-location.js'
import iterator from 'iterate-tree'
import parseSVG from 'svg-path-parser'


const auras = [
	{
		tags: [
			'earth colony',
			'federation colony',
			'federation outpost',
			'federation starbase',
			'federation science outpost',
		],
		size: 3,
		paint: 'url(#fed)',
	},
	{
		tags: ['federation member'],
		size: 6,
		paint: 'url(#fed)',
	},
	{
		tags: [
			'claimed by klingon empire',
			'klingon outpost',
		],
		size: 6,
		paint: 'url(#kling)',
	},
	{
		tags: [
			'claimed by romulan empire',
		],
		size: 6,
		paint: 'url(#romul)',
	},
	{
		tags: [
			'claimed by cardassian union',
		],
		size: 6,
		paint: 'url(#card)',
	},
	{
		tags: [
			'claimed by ferengi aliance',
		],
		size: 6,
		paint: 'url(#ferengi)',
	},
	{
		tags: [
			'claimed by breen confederacy',
		],
		size: 6,
		paint: 'url(#breen)',
	},
	{
		tags: [
			'claimed by tholian assembly',
		],
		size: 6,
		paint: 'url(#thol)',
	},
];

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
	render(data) {
		return data.map((element) => {
			switch (element.type) {
				case 'polygon':
				case 'QuadraticBezier':
				case 'textMarker':
				case 'points':
					return this._projectPolygonOrPoints(element);
				case 'lines':
					return this._projectLines(element);
				case 'symbol':
				case 'sphere':
					return this._projectPolygonOrPointsWithDist(element);
			}
		});
	}
}

const renderScene = (viewSettings, sceneSettings, sceneOptions, data3d, flat) => {
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
	}
	return {
		container,
		data: [...models]
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

function circleMeter(center, innerRadius, outerRadius, precision = 180, axis = 'z') {
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
	  x0: [],
	  x1: [],
	  y0: [],
	  y1: [],
	  z0: [],
	  z1: [],
	}

	for (let i = 0; i < Math.PI * 2; i = i + (Math.PI / precision)) {
	  points[`${axes[0]}0`].push(center[axes[0]] + Math.cos(i) * innerRadius);
	  points[`${axes[0]}1`].push(center[axes[0]] + Math.cos(i) * outerRadius);
	  points[`${axes[1]}0`].push(center[axes[1]] + Math.sin(i) * innerRadius);
	  points[`${axes[1]}1`].push(center[axes[1]] + Math.sin(i) * outerRadius);
	  points[`${axes[2]}0`].push(center[axes[2]]);
	  points[`${axes[2]}1`].push(center[axes[2]]);
	}

	return points;
}

function axisCircles(center, axes) {
	const circles = [];
	for (const axis of axes) {
		circles.push({
			color: 'deepPink',
			size: 1,
			type: 'QuadraticBezier',
			id: `axis-${axis}`,
			closed: true,
			...circle(center, 42, 79, axis),
		})
		circles.push({
			color: 'deepPink',
			size: 1,
			type: 'lines',
			id: `meter-${axis}`,
			closed: true,
			...circleMeter(center, 42, 42.75, 180, axis),
		})
		circles.push({
			color: 'deepPink',
			size: 1,
			type: 'lines',
			id: `cross-${axis}`,
			closed: true,
			...circleMeter(center, 0, 44, 2, axis),
		})
	}
	return circles
}

function Scene(viewSettings, dataOffset, setDataOffset) {
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

	iterator.bfs([...catalog], 'orbits', (object) => {
		const aura = auras.find((item) => {
			if (object?.tags) {
				return item.tags.filter(value => object.tags.includes(value))[0]
			} else {
				return false;
			}
		});
		if (aura && validLocation(object)) {
			points.push({
				id: object.id + '-aura',
				type: 'sphere',
				opacity: 0.5,
				color: aura.paint,
				size: aura.size * 30,
				x: [object.location.x],
				y: [object.location.y],
				z: viewSettings?.flat ? [0] : [object.location.z],
			});
		}
	})

	iterator.bfs([...catalog], 'orbits', (object) => {
		if (object.type === 'star' && validLocation(object) && !object?.tags?.includes('notable')) {
			points.push({
				id: object.id + '-asset',
				type: 'symbol',
				href: 'star',
				x: [object.location.x],
				y: [object.location.y],
				z: viewSettings?.flat ? [0] : [object.location.z],
			});
		}
	})

	iterator.bfs([...catalog], 'orbits', (object) => {
		if (object.location  && (object?.tags?.includes('notable'))) {
		let isBase =
		  object?.tags?.includes('federation starbase') ||
		  object?.tags?.includes('deep space station');
		let baseFontSize = isBase ? 9 : 16;
		let highlightedFontSize = isBase ? 16 : 19.2;
		if (validLocation(object)) {
			points.push({
			  label: object.name,
			  id: object.id,
			  pointer: isBase ? '▵' : '●',
			  type: 'textMarker',
			  size: object.id === focus ? highlightedFontSize : baseFontSize,
			  color: 'white',
			  attributes: {
				style: { cursor: 'pointer' },
				onClick: () => {
					setDataOffset({
						x: (object.location.x / sceneSettings.cubeRange) * -1,
						y: (object.location.y / sceneSettings.cubeRange) * -1,
						z: (object.location.z / sceneSettings.cubeRange) * -1,
					})
				}
			  },
			  layouts: isBase ? ['south', 'north'] : ['east', 'west'],
			  x: [object.location.x],
			  y: [object.location.y],
			  z: viewSettings?.flat ? [0] : [object.location.z],
			});
		}
	}
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
			...axisCircles(center, viewSettings?.flat ? ['z'] : ['x', 'z', 'y']),
			...points,
		],
		viewSettings?.flat,
	)
	return data;
}

const plugins = [quadraticBezier, textMarker, symbol, sphere]

export {
	Scene,
	plugins,
}
