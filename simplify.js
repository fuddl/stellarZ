const parseSVG = require('svg-path-parser');
const shapes2D = require('./src/2dShapes.json');

for (let shape of shapes2D) {
	const path = parseSVG(shape.d);
	const newPath = [];
	const existingPoints = [];
	for (const point of path) {
		let loc = (point.x && point.y) ? `${point.x}x${point.y}` : false;
		if (!loc || !existingPoints.includes(loc)) {
			switch (point.code) {
			  case 'M':
			  	newPath.push(`M${point.x},${point.y}`);
			  	break;
			  case 'L':
			  case 'C':
			    newPath.push(`L${point.x},${point.y}`);
			  	break;
			  case 'z':
			  case 'Z':
			    newPath.push(`z`);
			  	break;
			}
			if (loc) {
				existingPoints.push(loc);
			}
		}
	}
	console.debug(shape.id);
	console.debug(newPath.join(' '));
}