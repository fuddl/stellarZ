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
import catalog from './catalog.json'
import iterator from 'iterate-tree'

const auras = [
	{
		tags: [
			'earth colony',
			'federation colony',
			'federation outpost',
			'federation starbase'
		],
		size: 30,
		paint: 'url(#fed)',
	},
	{
		tags: ['federation member'],
		size: 60,
		paint: 'url(#fed)',
	},
	{
		tags: [
			'claimed by klingon empire',
			'klingon outpost',
		],
		size: 60,
		paint: 'url(#kling)',
	},
	{
		tags: [
			'claimed by romulan empire',
		],
		size: 60,
		paint: 'url(#romul)',
	},
	{
		tags: [
			'claimed by cardassian union',
		],
		size: 60,
		paint: 'url(#card)',
	},
];

class ExtendedDataRenderer extends DataRenderer {
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
			}
		});
	}
}

const renderScene = (viewSettings, sceneSettings, sceneOptions, data3d) => {
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
	const models = new ExtendedDataRenderer(cube.range, dataXoffset, dataYoffset, dataZoffset, cube.wrtCameraMatrix, projectionConstant).render(data3d);
	const container = {
		color: sceneOptions.paper.color,
		opacity: sceneOptions.paper.opacity || 1,
		xRange: sceneSettings.paperXrange,
		yRange: sceneSettings.paperYrange
	};
	return {
		container,
		data: [...models]
	};
};

function circle(radius, precision = 42, axis = 'z') {
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
	  points[axes[0]].push(Math.cos(i) * radius);
	  points[axes[1]].push(Math.sin(i) * radius);
	  points[axes[2]].push(0);
	}

	return points;
}

function circleMeter(innerRadius, outerRadius, precision = 180, axis = 'z') {
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
	  points[`${axes[0]}0`].push(Math.cos(i) * innerRadius);
	  points[`${axes[0]}1`].push(Math.cos(i) * outerRadius);
	  points[`${axes[1]}0`].push(Math.sin(i) * innerRadius);
	  points[`${axes[1]}1`].push(Math.sin(i) * outerRadius);
	  points[`${axes[2]}0`].push(0);
	  points[`${axes[2]}1`].push(0);
	}

	return points;
}

function axisCircles(axes) {
	const circles = [];
	for (const axis of axes) {
		circles.push({
			color: 'deepPink',
			size: 1,
			type: 'QuadraticBezier',
			id: `axis-${axis}`,
			closed: true,
			...circle(42, 79, axis),
		})
		circles.push({
			color: 'deepPink',
			size: 1,
			type: 'lines',
			id: `meter-${axis}`,
			closed: true,
			...circleMeter(42, 42.75, 180, axis),
		})
		circles.push({
			color: 'deepPink',
			size: 1,
			type: 'lines',
			id: `cross-${axis}`,
			closed: true,
			...circleMeter(0, 44, 2, axis),
		})
	}
	return circles
}

function Scene(viewSettings, setDataOffset) {
		const sceneSettings = {
		cubeRange: 20,
		cubeZoffset: 0,
		dataXoffset: viewSettings.dataXoffset,
		dataYoffset: viewSettings.dataYoffset,
		dataZoffset: 0,
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

	let objects = [...catalog]

	iterator.bfs(objects, 'orbits', (object) => {
		const aura = auras.find((item) => {
			if (object?.tags) {
				return item.tags.filter(value => object.tags.includes(value))[0]
			} else {
				return false;
			}
		});
		if (aura) {
			points.push({
				id: object.id + '-aura',
				type: 'points',
				opacity: 0.5,
				color: aura.paint,
				size: aura.size,
				x: [object.location.x],
				y: [object.location.y],
				z: viewSettings?.flat ? [0] : [object.location.z],
			});
		}
	})

	objects = [...catalog]

	iterator.bfs(objects, 'orbits', (object) => {
		if (object.location  && object?.tags?.includes('notable')) {
		let isBase =
		  object?.tags?.includes('federation starbase') ||
		  object?.tags?.includes('deep space station');
		let baseFontSize = isBase ? 9 : 16;
		let highlightedFontSize = isBase ? 16 : 19.2;
		const location = object?.location;
		if (typeof location == 'object' && 'x' in location && 'y' in location && 'z' in location) {
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
						z: viewSettings?.flat ? 0 : (object.location.z / sceneSettings.cubeRange) * -1,
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
 


	let { data } = renderScene(
		viewSettings,
		sceneSettings,
		emptySceneOptions,
		[
			...axisCircles(viewSettings?.flat ? ['z'] : ['x', 'z', 'y']),
			...points,
		],
	)
	return data;
}

const plugins = [quadraticBezier, textMarker]

export {
	Scene,
	plugins,
}
