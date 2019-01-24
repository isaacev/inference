import { Location } from '~/parser/grammar'

interface MarkerConfig {
  name: string
  location: Location
  description?: string
}

interface Line {
  text: string
  offset: number
  lineNum: number
}

export interface MarkedLine {
  line: Line
  marks: Mark[]
}

export interface Mark {
  name: string
  from: number
  to: number
}

export const markDocument = (doc: string, markers: MarkerConfig[]) => {
  if (locationsOverlap(markers.map(mark => mark.location))) {
    throw new Error('cannot use overlaping markers')
  }

  // Split document into individual lines, each tagged with the respective line
  // number and starting offset
  const lines = stringToLines(doc)

  // For each line, identify the markers that touch that line and which indices
  // of the line are touched by those markers
  const markedLines = lines.map(line => {
    const marks = markers
      .filter(mark => markerIncludesLine(mark, line))
      .map(({ name, location: { start, end } }) => {
        const from = Math.max(0, start.offset - line.offset)
        const to = Math.min(line.text.length, end.offset - line.offset)
        return { name, from, to }
      })

    return { line, marks } as MarkedLine
  })

  return markedLines
}

const stringToLines = (str: string, num = 1, offset = 0): Line[] => {
  return str.split('\n').map((text, index) => {
    const line = {
      text,
      offset: offset + index,
      lineNum: num++,
    }
    offset += text.length
    return line
  })
}

const markerIncludesLine = (marker: MarkerConfig, line: Line): boolean => {
  const markEndsBeforeLine = marker.location.end.offset <= line.offset
  const markStartsAfterLine =
    marker.location.start.offset >= line.offset + line.text.length
  return !markEndsBeforeLine && !markStartsAfterLine
}

export const locationsOverlap = (locs: Location[]): boolean => {
  return locs.some((loc1, index) => {
    return locs.slice(index + 1).some(loc2 => {
      const oneEndsBeforeTwo = loc1.end.offset <= loc2.start.offset
      const oneStartsAfterTwo = loc1.start.offset >= loc2.end.offset
      return (oneEndsBeforeTwo || oneStartsAfterTwo) === false
    })
  })
}
