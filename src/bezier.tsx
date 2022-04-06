import React, { useState, useEffect, useRef } from 'react'

const QuadraticBezier = {
  QuadraticBezier: (element:object, transforms:object):object => {
    const {
      size,
      color,
      opacity,
      id,
      closed,
      attributes,
    } = element
    let points = element.x.map((x, i):string => {
      const currentX:number = transforms.tx(x)
      const currentY:number = transforms.ty(element.y[i])
      if (i == 0) {
        return `M ${currentX},${currentY}`
      }
      if (i % 2 == 0) {
        return `S ${currentX},${currentY}`
      } else {
        return `${currentX},${currentY}`
      }
    }).join(' ')
    if (closed) {
      points += ' z';
    }

    return (
      <path
        d={points}
        key={id}
        stroke={color}
        fill="transparent"
        strokeWidth={size}
        {...attributes}
      />
    )
  }
}

export default QuadraticBezier