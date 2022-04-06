import Preact, { Fragment } from 'preact'

function Navigator({flat, coordinates}) {
  const dimensions = flat ? ['x', 'y'] : ['x', 'y', 'z'];
  return (
    <dl id="navigator">
      { dimensions.map((name, index) => (
        <Fragment key={name}>
          <dt>{name}</dt>
          <dd>{coordinates[name].toFixed(3)}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

export default Navigator