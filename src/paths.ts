export abstract class Segment {
  public abstract equalTo(other: Segment): boolean
  public abstract toString(): string
}

export class Field extends Segment {
  constructor(public name: string) {
    super()
  }

  public equalTo(other: Segment): boolean {
    return other instanceof Field && other.name === this.name
  }

  public toJSON() {
    return {
      typ: 'field',
      name: this.name,
    }
  }

  public toString() {
    return '.' + this.name
  }
}

export class Index extends Segment {
  public equalTo(other: Segment) {
    return other instanceof Index
  }

  public toString() {
    return '[]'
  }

  public toJSON() {
    return {
      typ: 'index',
    }
  }
}

export class Path {
  public static fromString(path: string): Path {
    if (path === '.') {
      return new Path()
    } else if (/^(\.[a-z]+)+$/i.test(path)) {
      return new Path(
        path
          .split('.')
          .slice(1)
          .map(f => new Field(f))
      )
    } else {
      throw new Error(`illegal path: "${path}"`)
    }
  }

  public static fromFields(fields: string[]): Path {
    if (fields.length === 0) {
      return new Path()
    } else {
      return new Path(fields.map(f => new Field(f.replace(/^\./, ''))))
    }
  }

  constructor(private segments: Segment[] = []) {}

  public length(): number {
    return this.segments.length
  }

  public head(): Segment | null {
    if (this.length() === 0) {
      return null
    } else {
      return this.segments[0]
    }
  }

  public rest(): Path {
    return new Path(this.segments.slice(1))
  }

  public hasHead(path: Path): boolean {
    if (path.length() > this.length()) {
      return false
    } else {
      return path.segments.every((seg, i) => seg.equalTo(this.segments[i]))
    }
  }

  public relativeTo(path: Path): Path {
    if (this.hasHead(path)) {
      return new Path(this.segments.slice(path.length()))
    } else {
      return this
    }
  }

  public toString(): string {
    if (this.length() === 0) {
      return '.'
    } else {
      return this.segments.map(s => s.toString()).join('')
    }
  }
}
