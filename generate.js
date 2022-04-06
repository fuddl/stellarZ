const gen = require('random-seed');
const roman = require('roman-numerals').toRoman;

Array.prototype.sortByOrd = function(){
	this.sort(function(a, b){
		if(a.ord < b.ord){
			return -1;
		}else if(a.ord > b.ord){
			return 1;
		}
		return 0;
	});
}

function addDiameter(object, generator) {
	switch (object.type) {
		case 'giant':
			object.diameter = generator.intBetween(49528, 142984)
			break;
		case 'planet':
			object.diameter = generator.intBetween(3020, 14271)
			break;
		case 'moon':
			object.diameter = generator.intBetween(504, 3476)
			break;
		default:
			object.diameter = generator.intBetween(4879, 39123)
	}
}

function generateSystem(system) {
	const randGen = gen.create(system.name);

	if (!system?.orbits?.length) {
		system.orbits = [];
	}

	let existingOrds = system?.orbits?.map((i) => { if (i?.ord) { return i.ord } });

	let minInnerPlanets = system?.orbits?.length ?? 0;

	if (minInnerPlanets > 0) {
		minInnerPlanets = Math.max(existingOrds);
	}

	const innerSystemAmount = randGen.intBetween(minInnerPlanets, 7);
	const outerSystemAmount = randGen.intBetween(1,4);

	for (var i = 1; i <= innerSystemAmount + outerSystemAmount + 1; i++) {
		const name = `${system.name} ${roman(i)}`;
		if (!existingOrds.includes(i)) {
			const generator = gen.create(system.name + i);
			let newObject = {}
			if (i <= innerSystemAmount) {
				newObject = {
					type: 'planet',
					name: name,
					ord: i,
					diameter: generator.intBetween(4879, 14271),
				};
			} else {
				if (generator.floatBetween(0, 1) > .3) {
					newObject = {
						type: 'giant',
						name: name,
						ord: i,
						diameter: generator.intBetween(49000, 150000),
					};
				}
			}
			addDiameter(newObject, generator);
			system.orbits.push(newObject);
		}
	}
	system.orbits.sortByOrd();

	for (let object of system.orbits) {
		if (!('diameter' in object)) {
			const generator = gen.create(system.name + JSON.stringify(object));
	    addDiameter(object, generator);
	  }
	}

}

module.exports = generateSystem;