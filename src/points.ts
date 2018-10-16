export class Point {
  public static fromPosition(pos: { line: number; ch: number }): Point {
    return new Point(pos.line + 1, pos.ch + 1)
  }

  constructor(public line: number, public column: number) {}

  public before(pt: Point): boolean {
    if (this.line > pt.line) {
      return false
    } else if (this.line === pt.line) {
      return this.column < pt.column
    } else {
      return true
    }
  }

  public equals(pt: Point): boolean {
    return this.line === pt.line && this.column === pt.column
  }

  public after(pt: Point): boolean {
    if (this.line < pt.line) {
      return false
    } else if (this.line === pt.line) {
      return this.column > pt.column
    } else {
      return true
    }
  }

  public toPosition() {
    return {
      line: this.line - 1,
      ch: this.column - 1,
    }
  }

  public toJSON() {
    return {
      line: this.line,
      column: this.column,
    }
  }

  public toString(): string {
    return `(${this.line}:${this.column})`
  }
}

export class Range {
  constructor(public left: Point, public right: Point = left) {}

  public toJSON() {
    return {
      left: this.left,
      right: this.right,
    }
  }

  public toString(): string {
    if (this.left.equals(this.right)) {
      return `at ${this.left}`
    } else {
      return `from ${this.left} to ${this.right}`
    }
  }
}
