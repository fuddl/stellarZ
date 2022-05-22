import Preact from 'preact'

const colours = {
	'fed': '#98A0B5',
	'kli': '#E51301',
	'rom': '#235645',
	'car': 'brown',
	'fer': 'gold',
	'bre': '#173F00',
	'tho': 'orange',
	'tze': 'lime',
	'gor': '#8b0a50',
}

function Gradients() {
	return (
		<svg hidden>
		<defs>
			{Object.entries(colours).map((colour) => (
				<radialGradient id={colour[0]}>
					<stop offset="10%" stopColor={colour[1]} stopOpacity=".5" />
					<stop offset="100%" stopColor={colour[1]} stopOpacity="0" />
				</radialGradient>
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


