import Unknown from '~/types/unknown'
import { Globals, Node, AssumptionError, Lessons } from '~/solver/nodes'
import Path from '~/paths'
import { Constraint } from '~/solver/constraints'
import Type from '~/types'

const MAX_ATTEMPTS = 100

export const solve = (template: string, constraints: Constraint[]): Type => {
  if (constraints.length === 0) {
    return new Unknown()
  }

  const lessons = new Lessons()
  const globals: Globals = { template, lessons }

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      return attemptToSolve(globals, constraints)
    } catch (err) {
      if (err instanceof AssumptionError) {
        const { path, shouldBe } = err
        lessons.addLesson(path, shouldBe)
        continue
      }

      throw err
    }
  }

  throw new Error(`unable to solve after ${MAX_ATTEMPTS} attempts`)
}

const attemptToSolve = (globals: Globals, constraints: Constraint[]): Type => {
  let root = Node.create(
    globals,
    new Path(),
    constraints[0].path,
    constraints[0]
  )
  for (const cons of constraints.slice(1)) {
    root = root.extend(globals, cons.path, cons)
  }

  return root.derrive()
}
