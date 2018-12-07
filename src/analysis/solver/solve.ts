import { Segment, Index, Field } from '../types/paths'
import { Type, Unknown, Tuple, List, Dict, intersect } from '../types/types'
import { AtLeast } from '../types/predicates'
import { TypeError } from '../types/errors'
import { TemplateTypeError, HelpfulTemplateTypeError } from '../syntax/errors'
import { Statement, Location } from '../syntax/tree'
import { stmtsToConstraints } from './constraints'

export const solve = (stmts: Statement[]): Type => {
  const cons = stmtsToConstraints(stmts)

  let root = null as Branch | null
  for (const con of cons) {
    if (root === null) {
      root = new Branch(null, con.origin)
    }

    let curr = root
    for (const seg of con.path.segments) {
      curr = curr.followSegment(seg, con.origin)
    }
    curr.setType(con.type)
  }

  if (root === null) {
    return new Unknown()
  } else {
    return root.type
  }
}

class Branch {
  public type = new Unknown() as Type
  public pairs = [] as SegmentPair[]

  constructor(public parent: Branch | null, public origin: Location) {}

  setType(type: Type) {
    this.type = intersectInPlace(this.type, type, this.origin)
    if (this.parent !== null) {
      this.parent.updateType(this.origin)
    }
  }

  updateType(origin: Location) {
    this.type = aggregate(this.pairs, origin)
    if (this.parent !== null) {
      this.parent.updateType(origin)
    }
  }

  followSegment(seg: Segment, origin: Location): Branch {
    const pair = this.pairs.find(pair => pair.seg.equalTo(seg))
    if (pair) {
      return pair.ref
    } else {
      const ref = new Branch(this, origin)
      this.pairs.push({ seg, ref })
      return ref
    }
  }
}

interface SegmentPair {
  seg: Segment
  ref: Branch
}

interface IndexPair extends SegmentPair {
  seg: Index
}

interface FieldPair extends SegmentPair {
  seg: Field
}

const aggregate = (pairs: SegmentPair[], origin: Location): Type => {
  if (pairs.length === 0) {
    return new Unknown()
  }

  if (areTuplePairs(pairs)) {
    // The largest index will set the tuple's length
    const len = minimumLength(pairs)

    // For each member in the tuple, find a solution
    // for all constraints on that member
    const members = mapRepeat(len, index => {
      const matchingPairs = findPairsForIndex(index, pairs)
      return intersectPairTypes(matchingPairs, origin)
    })

    return new Tuple(members)
  }

  if (areListPairs(pairs)) {
    // Find a solution that satisfies all constraints on the list's element
    const element = intersectPairTypes(pairs, origin)

    // The largest index will set the list's minimum length
    const length = new AtLeast(minimumLength(pairs))

    return new List(element, length)
  }

  if (areDictPairs(pairs)) {
    // For each unique field name, find a solution for all
    // constraints that apply to that field
    const fields = uniqueFieldNames(pairs).map(name => {
      const matchingPairs = findPairsForField(name, pairs)
      const type = intersectPairTypes(matchingPairs, origin)
      return { name, type }
    })

    return new Dict(fields)
  }

  // If the segments don't all fit one of the categories above, determine which
  // segments are causing an error.
  const firstPair = pairs[0]
  const help = firstPair.ref.origin
  if (firstPair.seg instanceof Index) {
    // If the first pair has an Index segment, the error will
    // be caused by the first pair with a non-Index segment.
    const err = new TypeError(`unable to use branch or field on list`)
    throw new HelpfulTemplateTypeError(err, origin, help)
  } else if (firstPair.seg instanceof Field) {
    // If the first pair has a Field segment, the error will
    // be caused by the first pair with a non-Field segment.
    const err = new TypeError(`unable to use index or branch on dict`)
    throw new HelpfulTemplateTypeError(err, origin, help)
  } else {
    const err = new TypeError(`unspecified`)
    throw new HelpfulTemplateTypeError(err, origin, help)
  }
}

const areListPairs = (pairs: SegmentPair[]): pairs is IndexPair[] => {
  return pairs.every(pair => pair.seg instanceof Index)
}

const areTuplePairs = (pairs: SegmentPair[]): pairs is IndexPair[] => {
  if (areListPairs(pairs)) {
    return pairs.every(pair => pair.seg.hasIndex())
  } else {
    return false
  }
}

const areDictPairs = (pairs: SegmentPair[]): pairs is FieldPair[] => {
  return pairs.every(pair => pair.seg instanceof Field)
}

const minimumLength = (pairs: IndexPair[]): number => {
  return pairs
    .map(pair => (pair.seg.index ? pair.seg.index + 1 : 0))
    .reduce((max, index) => Math.max(max, index))
}

const findPairsForIndex = (index: number, pairs: IndexPair[]): IndexPair[] => {
  return pairs.filter(pair => pair.seg.index === index)
}

const intersectPairTypes = (pairs: SegmentPair[], help: Location): Type => {
  return pairs.reduce((type, pair) => {
    try {
      return intersect(type, pair.ref.type)
    } catch (err) {
      if (err instanceof TypeError) {
        throw new HelpfulTemplateTypeError(err, pair.ref.origin, help)
      } else {
        throw err
      }
    }
  }, new Unknown())
}

const intersectInPlace = (was: Type, apply: Type, origin: Location): Type => {
  try {
    return intersect(was, apply)
  } catch (err) {
    if (err instanceof TypeError) {
      throw new TemplateTypeError(err, origin)
    } else {
      throw err
    }
  }
}

const mapRepeat = <T>(num: number, fn: (num: number) => T): T[] => {
  const acc = [] as T[]
  for (let i = 0; i < num; i++) {
    acc.push(fn(i))
  }
  return acc
}

const uniqueFieldNames = (pairs: FieldPair[]): string[] => {
  return pairs.map(pair => pair.seg.name).reduce(
    (unique, name) => {
      if (unique.indexOf(name) === -1) {
        return unique.concat(name)
      } else {
        return unique
      }
    },
    [] as string[]
  )
}

const findPairsForField = (name: string, pairs: FieldPair[]): FieldPair[] => {
  return pairs.filter(pair => pair.seg.name === name)
}
