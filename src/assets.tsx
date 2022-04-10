import Preact from 'preact'

function Gradients({flat, coordinates}) {
	return (
		<svg hidden>
		<defs>
			<radialGradient id="fed">
				<stop offset="0%" stopColor="#98A0B5" stopOpacity=".75" />
				<stop offset="100%" stopColor="#98A0B5" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="kling">
				<stop offset="0%" stopColor="#E51301" stopOpacity=".75" />
				<stop offset="100%" stopColor="#E51301" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="romul">
				<stop offset="0%" stopColor="#235645" stopOpacity=".75" />
				<stop offset="100%" stopColor="#235645" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="card">
				<stop offset="0%" stopColor="brown" stopOpacity=".75" />
				<stop offset="100%" stopColor="brown" stopOpacity="0" />
			</radialGradient>
			<radialGradient id="ferengi">
				<stop offset="0%" stopColor="gold" stopOpacity=".75" />
				<stop offset="100%" stopColor="gold" stopOpacity="0" />
			</radialGradient>
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
