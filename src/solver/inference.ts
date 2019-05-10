import { Lessons, AssumptionRollback } from './assumptions'
import { Node, EmptyNode } from '~/solver/nodes'
import { Constraint } from './constraints'
import Type from '~/types'

export class Snapshot {
  constructor(public root: Node, public constraints: Constraint[]) {}

  continue() {
    return this.constraints.length > 0
  }

  next(template: string, lessons: Lessons): Snapshot {
    if (this.constraints.length === 0) {
      return this
    }

    const g = { template, lessons, previousSnapshot: this }
    const [c, ...cs] = this.constraints
    return new Snapshot(this.root.extend(g, c.path, c), cs)
  }
}

export const solve = (template: string, constraints: Constraint[]): Type => {
  console.time('solve')
  const lessons = new Lessons()

  let snapshot = new Snapshot(new EmptyNode(), constraints)
  while (snapshot.continue()) {
    try {
      snapshot = snapshot.next(template, lessons)
    } catch (err) {
      if (err instanceof AssumptionRollback) {
        lessons.add(err.lesson)
        snapshot = err.previousSnapshot
      } else {
        console.timeEnd('solve')
        throw err
      }
    }
  }

  console.timeEnd('solve')
  return snapshot.root.derrive()
}
