const parseSVG = require('svg-path-parser');

const path2polygon = function(d) {
	const path = parseSVG(d);
	let polygon = [];
	for (const point of path) {
		switch (point.code) {
			case 'M':
			case 'L':
			case 'C':
				polygon.push([
					point.x,
					point.y *-1,
				]);
			break;
		}
	}
	return polygon;
}

module.exports = path2polygon;