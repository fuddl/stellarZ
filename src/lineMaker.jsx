import {GraphBuilder, DijkstraStrategy} from 'js-shortest-path'
import distance from 'euclidean-distance'

export default function lineMaker(points, primary, secondary, neigbors = 3, props) {
	let rPoints = []
	let tags = [...secondary, primary]
	for (let point of points) {
		let isRelevant = false
		for (let tag of tags) {
			if (point?.tags?.includes(tag)) {
				isRelevant = true
			}
		}
		if (isRelevant) {
			rPoints.push(point)
		}
	}
	const g = GraphBuilder()

	for (let pointA of rPoints) {
		let AB = []
		let dis
		for (let pointB of rPoints) {
			if (pointA !== pointB) {
				dis = distance(
					[
						pointA.location.x,
						pointA.location.y,
						pointA.location.z,
					],
					[
						pointB.location.x,
						pointB.location.y,
						pointB.location.z,
					],	
				)
				if (dis) {
					AB.push([pointA.name, pointB.name, dis])
				}
			}
		}
		let shortestAB = AB.sort(
			(A, B) => B[2] < A[2],
		)
		for (var i = 0; i < neigbors; i++) {
			g.edge(shortestAB[i][0], shortestAB[i][1], shortestAB[i][2]) 
		}
	}

	const graph = g.build()

	const dijkstra = DijkstraStrategy(graph)

	let output = []

	for (let primaryPoint of rPoints) {
		if (primaryPoint?.tags.includes(primary)) {
			for (let secondaryPoint of rPoints) {
				if (!secondaryPoint?.tags.includes(primary)) {
					let shortest = dijkstra.shortest(secondaryPoint.name, primaryPoint.name)
					let path = shortest.path()
					if (path.length > 1) {
						let line = {
							type: 'lines',
							x0: [],
							y0: [],
							z0: [],
							x1: [],
							y1: [],
							z1: [],
							id: secondaryPoint.name + '→' + primaryPoint.name,
							...props,
						}
						let i = 0
						for (let waypoint of path) {
							let waypointObject = points.find(element => element.name === waypoint)
							if (i % 2 == 0) {
								line.x0.push(waypointObject.location.x)
								line.y0.push(waypointObject.location.y)
								line.z0.push(waypointObject.location.z)
							} else {
								line.x1.push(waypointObject.location.x)
								line.y1.push(waypointObject.location.y)
								line.z1.push(waypointObject.location.z)
							}
							i++
						}
						output.push(line)
					} 
				}
			}
		}
	}
	console.log(output)
  return output
}