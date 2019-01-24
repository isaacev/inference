import { Location } from '~/parser/grammar'

export const firstLocation = (l1: Location, l2: Location): Location => {
  if (l1.start.line < l2.start.line) {
    return l1
  } else if (l1.start.column < l2.start.column) {
    return l1
  } else {
    return l2
  }
}

export { Location } from '~/parser/grammar'
