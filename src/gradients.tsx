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
		</defs>
	</svg>
  )
}

export default Gradients
