const fs = require('fs').promises
const yaml = require('js-yaml')
const intersection = require('array-intersection')
const toArabic = require('roman-numerals').toArabic
const gen = require('random-seed')

const randomness = gen.create(42)

const schemeRegex = /(.+)\s\b((?:I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3}|XL|L|LX{0,3}|XC|C|C(?:M|D)|D|D(?:C{0,3}|M)|M{0,3}))\b$/

const addFillerNames = async (data) => {

	const filler = yaml.load(await fs.readFile('filler.yml', 'utf8'))
	filler.sort((A, B) => randomness.intBetween(-1, 1));

	for (let object of data) {
		if (!object?.tags?.includes('filler')) {
			continue
		}

	  for (let possibleFiller of filler) {
	  	if (possibleFiller?.used) {
	  		continue
	  	}
	  	if (intersection(object.tags, possibleFiller.tags).length > 0) {
		    let commonScheme = null
		    if (!'type' in possibleFiller || possibleFiller.type !== 'installation') {
		    	commonScheme = possibleFiller.name.match(schemeRegex)
		    }
		    
		    possibleFiller.tags.push('filler')

		    object.orbits = [
		  		{ ...possibleFiller, ...{
		  			tags: possibleFiller.tags,
		  			ord: commonScheme?.[2] ? toArabic(commonScheme[2]) : null,
		  		} }
		  	]
		    object.tags = []
		    
		    if (commonScheme) {
		    	object.name = commonScheme[1]
		    }
		  	possibleFiller.used = true
	  	}
	  }
	}
	return data
}

module.exports = addFillerNames