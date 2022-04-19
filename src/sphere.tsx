const Circle = ({ x, y, dist, transforms, href, id, i, size, color }) => {
  const ratio = 1 / dist;
  return (
    <circle
      {...{
        id: `${id}-${i}`,
        cx: transforms.tx(x),
        cy: transforms.ty(y),
        r: size * ratio,
        fill: color,
        'data-dist': ratio,
      }}
    />
  )
}

const spheresPlugin = {
  sphere: (element, transforms) => {
    const { x, y, href, id, color } = element
    return element.x.map((x, i) => (
      <Circle
        {...{
          x,
          y: element.y[i],
          dist: element.dist[i],
          size: element.size,
          color: color,
          id,
          i,
          href,
          transforms
        }}
        key={`${id}-${i}`}
      />
    ))
  }
}

export default spheresPlugin