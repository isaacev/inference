export abstract class Predicate<T> {
  public abstract acceptsValue(val: T): boolean
  public abstract acceptsPredicate(pred: Predicate<T>): boolean
  public abstract toString(): string
}

export abstract class NumPredicate extends Predicate<number> {
  public static combine(p1: NumPredicate, p2: NumPredicate) {
    if (p1.acceptsPredicate(p2)) {
      return p1
    } else if (p2.acceptsPredicate(p1)) {
      return p2
    } else {
      throw new Error('cannot combine number predicates')
    }
  }
}

export class AtLeast extends NumPredicate {
  constructor(public min: number) {
    super()
  }

  public acceptsValue(val: number) {
    return val <= this.min
  }

  public acceptsPredicate(pred: NumPredicate): boolean {
    if (pred instanceof AtLeast) {
      return this.min <= pred.min
    } else {
      return false
    }
  }

  public toString() {
    return `(length >= ${this.min})`
  }
}

export class NonZero extends AtLeast {
  constructor() {
    super(1)
  }
}

export class Zero extends NumPredicate {
  public acceptsValue(val: number) {
    return val === 0
  }

  public acceptsPredicate(pred: NumPredicate): boolean {
    if (pred instanceof Zero) {
      return true
    } else {
      return false
    }
  }

  public toString() {
    return `(length == 0)`
  }
}
