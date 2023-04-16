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
import connections from './connections.json'



import iterator from 'iterate-tree'
import parseSVG from 'svg-path-parser'
import Assets from './assets.tsx'

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
		class: 'fed',
		paint: 'url(#fed)',
	},
	{
		tags: ['federation member'],
		size: 6,
		class: 'fed',
		paint: 'url(#fed)',
	},
	{
		tags: [
			'klingon capital',
			'occupied by klingon empire',
		],
		size: 6,
		class: 'kli',
		paint: 'url(#kli)',
	},
	{
		tags: [
			'claimed by klingon empire',
			'klingon outpost',
			'klingon colony',
			'klingon holy site',
			'klingon starbase',
		],
		size: 3,
		class: 'kli',
		paint: 'url(#kli)',
	},
	{
		tags: [
			'claimed by romulan empire',
			'romulan starbase',
		],
		size: 6,
		class: 'rom',
		paint: 'url(#rom)',
	},
	{
		tags: [
			'claimed by cardassian union',
			'cardassian starbase',
		],
		size: 6,
		class: 'car',
		paint: 'url(#car)',
	},
	{
		tags: [
			'claimed by ferengi aliance',
		],
		size: 6,
		class: 'fer',
		paint: 'url(#fer)',
	},
	{
		tags: [
			'claimed by breen confederacy',
		],
		size: 6,
		class: 'bre',
		paint: 'url(#bre)',
	},
	{
		tags: [
			'claimed by tholian assembly',
		],
		size: 6,
		class: 'tho',
		paint: 'url(#tho)',
	},
	{
		tags: [
			'tzenketh homeword',
			'tzenketh colony'
		],
		size: 6,
		class: 'tze',
		paint: 'url(#tze)',
	},
	{
		tags: [
			'claimed by gorn'
		],
		size: 6,
		class: 'gor',
		paint: 'url(#gor)',
	},
	{
		tags: [
			'talarian homeworld',
			'claimed by talarian',
		],
		size: 6,
		class: 'tal',
		paint: 'url(#tal)',
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

function localSpaceGrid(center) {
	const circles = [];
	const minR = 50
	const maxR = 350
	const A = Math.PI / 6
	for (let step = 0; step < Math.PI * 2; step += A) {
		circles.push({
			color: '#222',
			size: 1,
			type: 'lines',
			id: `radial-local-${step}`,
	        x0: [center.x + minR * Math.cos(step)],
	        y0: [center.y + minR * Math.sin(step)],
	        z0: [center.z],
	        x1: [center.x + maxR * Math.cos(step)],
	        y1: [center.y + maxR * Math.sin(step)],
	        z1: [center.z],
		})
	}
	for (let step = 1; step < 8; step++) {
		circles.push({
			color: '#222',
			size: 1,
			type: 'QuadraticBezier',
			id: `concentric-local-${step}`,
			closed: true,
			...circle(center, 50*step, 79, 'z'),
		})
	}
	return circles
}

const localSpaceCenter = {x: 16, y: -142, z: -120}

function Scene(viewSettings, dataOffset, setDataOffset, catalog) {
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

	// for (const cluster of connections) {
	// 	if (!cluster?.connections) {
	// 		continue
	// 	}
	// 	for (const connection of cluster.connections) {
	// 		points.push({
	// 		  id: connection.hash,
	// 		  type: 'lines',
	// 		  color: `url(#${cluster.id}-inverted)`,
	// 		  x0: [connection.A.x],
	// 		  x1: [connection.B.x],
	// 		  y0: [connection.A.y],
	// 		  y1: [connection.B.y],
	// 		  z0: viewSettings?.flat ? [0] : [connection.A.z],
	// 		  z1: viewSettings?.flat ? [0] : [connection.B.z],
	// 		});
	// 	}
	// }

	for (const entry of catalog) {
		const aura = auras.find((item) => {
			if (entry?.tags) {
				return item.tags.filter(value => entry.tags.includes(value))[0]
			} else {
				return false;
			}
		});

		// if (entry?.notablePlanets || entry?.tags.includes('notable')) {
		// 	points.push({
		// 		label: entry.notablePlanets || entry.name,
		// 		id: entry.id,
		// 		pointer: '●',
		// 		type: 'textMarker',
		// 		attributes: { class: aura?.class },
		// 		size: 16,
		// 		color: 'white',
		// 		x: [entry.location.x],
		// 		y: [entry.location.y],
		// 		z: viewSettings?.flat ? [0] : [entry.location.z],
		// 	});
		// }
		// else if (entry.type === 'star' || entry.type === 'system') {
		// 	points.push({
		// 		label: entry.name,
		// 		id: entry.id,
		// 		pointer: '✴',
		// 		attributes: { class: aura?.class },
		// 		type: 'textMarker',
		// 		size: 12,
		// 		color: 'white',
		// 		x: [entry.location.x],
		// 		y: [entry.location.y],
		// 		z: viewSettings?.flat ? [0] : [entry.location.z],
		// 	});
		// } else {
			points.push({
				id: entry.id,
				type: 'points',
				size: 2,
				color: `var(--${aura?.class})`,
				x: [entry.location.x],
				y: [entry.location.y],
				z: viewSettings?.flat ? [0] : [entry.location.z],
			});
		//}
	}


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
			...localSpaceGrid(localSpaceCenter),
			//...axisCircles(center, viewSettings?.flat ? ['z'] : ['x', 'z', 'y']),
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
