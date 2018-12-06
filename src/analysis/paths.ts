export namespace paths {
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
    constructor(public index?: number) {
      super()
    }

    public hasIndex(): boolean {
      return typeof this.index === 'number'
    }

    public equalTo(other: Segment): boolean {
      if (other instanceof Index) {
        return this.index === other.index
      } else {
        return false
      }
    }

    public toString() {
      if (this.hasIndex()) {
        return `[${this.index}]`
      } else {
        return '[*]'
      }
    }

    public toJSON() {
      return {
        typ: 'index',
      }
    }
  }

  export class Branch extends Segment {
    constructor(public branch: number) {
      super()
    }

    public equalTo(other: Segment): boolean {
      if (other instanceof Branch) {
        return this.branch === other.branch
      } else {
        return false
      }
    }

    public toString() {
      return `|${this.branch}|`
    }

    public toJSON() {
      return {
        typ: 'branch',
        branch: this.branch,
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
        return new Path(
          fields.map(f => {
            if (/^\.\d+$/.test(f)) {
              return new Index(parseInt(f.slice(1), 10))
            } else {
              return new Field(f.replace(/^\./, ''))
            }
          })
        )
      }
    }

    constructor(public segments: Segment[] = []) {}

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

    public tail(): Segment | null {
      if (this.length() === 0) {
        return null
      } else {
        return this.segments[this.segments.length - 1]
      }
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

    public concat(append: Path | Segment): Path {
      if (append instanceof Segment) {
        return new Path(this.segments.concat(append))
      } else {
        return new Path(this.segments.concat(append.segments))
      }
    }

    public toLabel(): string {
      const tail = this.tail()
      if (tail !== null && tail instanceof Field) {
        return tail.name
      } else {
        return ''
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
}
