const SvgSymbol = ({ x, y, dist, transforms, href, id, title }) => {
  return (
    <use
      {...{
        x: transforms.tx(x),
        y:  transforms.ty(y),
        id: `${id}`,
        href: `#${href}`,
      }}
    >
      { title ?? <title>{ title }</title> }
    </use>
  )
}

const symbolsPlugin = {
  symbol: (element, transforms) => {
    //console.debug(element);
    const { x, y, href, id, title } = element
    return element.x.map((x, i) => (
      <SvgSymbol
        {...{
          x,
          y: element.y[i],
          dist: element.dist[i],
          id,
          i,
          href,
          transforms,
          title,
        }}
        key={`${id}-${i}`}
      />
    ))
  }
}

export default symbolsPlugin