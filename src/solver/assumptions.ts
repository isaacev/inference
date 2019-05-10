import Path from '~/paths'
import Type from '~/types'
import { Snapshot } from './inference'

export class Lesson {
  constructor(public path: Path, public shouldBe: typeof Type) {}
}

export class Lessons {
  private table: { [path: string]: Lesson } = {}

  public has(path: Path) {
    return this.table.hasOwnProperty(path.toString())
  }

  public get(path: Path): Lesson | undefined {
    return this.table[path.toString()]
  }

  public add(lesson: Lesson) {
    this.table[lesson.path.toString()] = lesson
  }

  public shouldBe(path: Path, shouldBe: typeof Type) {
    if (this.has(path)) {
      return (this.get(path) as Lesson).shouldBe === shouldBe
    } else {
      return false
    }
  }
}

export class AssumptionRollback {
  public previousSnapshot: Snapshot
  public lesson: Lesson

  constructor(previousSnapshot: Snapshot, lesson: Lesson) {
    this.previousSnapshot = previousSnapshot
    this.lesson = lesson
  }
}

export class AssumptionBookmark {
  public previousSnapshot: Snapshot
  public path: Path

  constructor(previousSnapshot: Snapshot, path: Path) {
    this.previousSnapshot = previousSnapshot
    this.path = path
  }

  rollback(shouldBe: typeof Type): never {
    throw new AssumptionRollback(
      this.previousSnapshot,
      new Lesson(this.path, shouldBe)
    )
  }
}
