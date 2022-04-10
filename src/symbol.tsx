const SvgSymbol = ({ x, y, transforms, href, id }) => {
  return (
    <use
      {...{
        x: transforms.tx(x),
        y:  transforms.ty(y),
        id: `${id}`,
        href: `#${href}`
      }}
    />
  )
}

const symbolsPlugin = {
  symbol: (element, transforms) => {
    const { x, y, href, id } = element
    return element.x.map((x, i) => (
      <SvgSymbol
        {...{
          x,
          y: element.y[i],
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

export default symbolsPlugin