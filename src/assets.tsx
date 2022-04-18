import Preact from 'preact'

function Gradients({flat, coordinates}) {
	const colours = {
		'fed': '#98A0B5',
		'kling': '#E51301',
		'romul': '#235645',
		'card': 'brown',
		'ferengi': 'gold',
		'breen': '#173F00',
		'thol': 'orange',
	}
	return (
		<svg hidden>
		<defs>
			{Object.entries(colours).map((colour) => (
				<radialGradient id={colour[0]}>
					<stop offset="0%" stopColor={colour[1]} stopOpacity=".75" />
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

export default Gradients
