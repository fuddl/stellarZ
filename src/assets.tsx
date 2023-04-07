import Preact from 'preact'

const colours = {
	'fed': '#267BBA',
	'kli': '#D02C45',
	'rom': '#12B6BB',
	'car': '#39793F',
	'fer': '#D3AF2B',
	'bre': '#245452',
	'tho': '#BD5328',
	'tze': '#5E48A9',
	'gor': '#5E0B09',
	'tal': '#270B6D',
}

function Gradients() {
	return (
		<svg hidden>
		<defs>
			<style>{Object.entries(colours).map(([k, v]) => `.${k} { fill: ${v} }`).join(' ')}</style>
			{Object.entries(colours).map((colour) => (
				<>
					<radialGradient id={colour[0]}>
						<stop offset="10%" stopColor={colour[1]} stopOpacity=".5" />
						<stop offset="100%" stopColor={colour[1]} stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`${colour[0]}-inverted`}>
						<stop offset="10%" stopColor={colour[1]} stopOpacity="0" />
						<stop offset="100%" stopColor={colour[1]} stopOpacity=".5" />
					</radialGradient>
				</>
			)) }
			<symbol id="star" width="32" height="32" overflow="visible" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet">
				<circle cx="0" cy="0" r="2" fill="url(#sunray)"/>
				{/*	
		  		<ellipse cx="0" cy="0" rx="1" ry="16" opacity=".5" fill="url(#sunray)"/>
					<ellipse cx="0" cy="0" rx="16" ry="1" opacity=".5" fill="url(#sunray)"/>
				*/}
			</symbol>
			<radialGradient id="sunray">
				<stop offset="0" stop-color="#fff"/>
				<stop offset="1" stop-color="#fff" stop-opacity="0"/>
			</radialGradient>
		</defs>
	</svg>
	)
}

export default { colours, Gradients }


