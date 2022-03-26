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
			if (i <= innerSystemAmount) {
				system.orbits.push({
					type: 'planet',
					name: name,
					ord: i,
					diameter: generator.intBetween(4879, 14271),
				});
			} else {
				if (generator.floatBetween(0, 1) > .3) {
					system.orbits.push({
						type: 'giant',
						name: name,
						ord: i,
						diameter: generator.intBetween(49000, 150000),
					});
				}
			}
		}
	}
	system.orbits.sortByOrd();
}

module.exports = generateSystem;