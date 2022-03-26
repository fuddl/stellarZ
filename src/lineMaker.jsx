import { GraphBuilder, DijkstraStrategy } from 'js-shortest-path';
import distance from 'euclidean-distance';
import clamp from 'clamp';

function makeID(a, b) {
	return [a, b].sort().join('↔');
}

export default function lineMaker(
	points,
	primary,
	secondary,
	ends,
	neigbors = 3,
	props,
	mode,
	start,
	dest,
) {
	let rPoints = [];
	let tags = { ...ends, ...secondary, primary };
	for (let point of points) {
		let isRelevant = false;
		for (let tag in tags) {
			if (point?.tags?.includes(tag)) {
				isRelevant = true;
			}
		}
		if (isRelevant) {
			rPoints.push(point);
		}
	}
	const g = GraphBuilder();

	let allLines = [];


	for (let pointA of rPoints) {
		let AB = [];
		let dis;
		for (let pointB of rPoints) {
			if (!Object.keys(ends).some((v) => pointB.tags.includes(v))) {
				if (pointA !== pointB) {
					dis = distance(
						[pointA.location.x, pointA.location.y, pointA.location.z],
						[pointB.location.x, pointB.location.y, pointB.location.z],
					);
					let lineTags = [...pointA.tags, ...pointB.tags];
					const bonus = Math.max(
						...lineTags.map((v) => {
							if (secondary[v]) {
								return secondary[v];
							}
							return 0;
						}),
					);

					if (dis) {
						AB.push([pointA.name, pointB.name, clamp(dis - bonus, 0, dis)]);
					}
				}
			}
		}
		let shortestAB = AB.sort((A, B) => A[2] - B[2]);
		let numberOfNeigbors = Object.keys(ends).some((v) =>
			pointA.tags.includes(v),
		)
			? 3
			: neigbors;
		for (var i = 0; i < numberOfNeigbors; i++) {
			allLines.push({
				id: makeID(shortestAB[i][0], shortestAB[i][1]),
				start: shortestAB[i][0],
				end: shortestAB[i][1],
				traffic: 0,
			});
			g.edge(shortestAB[i][0], shortestAB[i][1], shortestAB[i][2]);
		}
	}

	const graph = g.build();

	const dijkstra = DijkstraStrategy(graph);

	let arms = [];

	for (let primaryPoint of rPoints) {
		if (primaryPoint?.tags.includes(primary)) {
			for (let secondaryPoint of rPoints) {
				const id = secondaryPoint.name + '→' + primaryPoint.name;
				if (!secondaryPoint?.tags.includes(primary)) {
					let shortest = dijkstra.shortest(
						secondaryPoint.name,
						primaryPoint.name,
					);
					let path = shortest.path();

					let begin = points.find(
						(element) => element.name === secondaryPoint.name,
					);

					let stops = {
						...props,
						attributes: {
							style: {
								mixBlendMode: 'screen',
							},
							opacity: 0.75 / props.size,
						},
						size: 1,
						id: id,
						type: 'QuadraticBezier',
						x: [begin.location.x],
						y: [begin.location.y],
						z: [begin.location.z],
					};

					let lastWaypoint = false;
					for (let waypoint of path) {
						if (lastWaypoint) {
							let index = allLines.findIndex((e) => {
								return e.id === makeID(waypoint, lastWaypoint);
							});
							if (index > -1) {
								allLines[index].traffic++;
							}
							let stop = points.find((element) => element.name === waypoint);
							let preStop = points.find(
								(element) => element.name === lastWaypoint,
							);
							if (mode === 'bezier') {
								stops.x.push((stop.location.x + preStop.location.x) / 2);
								stops.y.push((stop.location.y + preStop.location.y) / 2);
								stops.z.push((stop.location.z + preStop.location.z) / 2);
								stops.x.push(stop.location.x);
								stops.y.push(stop.location.y);
								stops.z.push((stop.location.z + preStop.location.z) / 2);
							}
						}
						lastWaypoint = waypoint;
					}
					arms.push(stops);
				}
			}
		}
	}

	if (mode === 'bezier') {
		return arms;
	}

	if (mode === 'lines') {
		let allLinesSorted = allLines
			.sort((A, B) => A.traffic - B.traffic)
			.reverse();
		let output = [];
		for (let line of allLinesSorted) {
			if (line.traffic > 0) {
				let start = points.find((element) => element.name === line.start);
				let end = points.find((element) => element.name === line.end);
				output.push({
					...props,
					type: 'lines',
					x0: [start.location.x],
					y0: [start.location.y],
					z0: [start.location.z],
					x1: [end.location.x],
					y1: [end.location.y],
					z1: [end.location.z],
					id: line.id,
					size: line.traffic / props.size,
				});
			}
		}

		return output;
	}
}
