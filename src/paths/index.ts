import Segment from '~/paths/segments'
import { StaticOffset } from '~/paths/segments/offset'
import Field from '~/paths/segments/field'

export default class Path {
  constructor(public readonly segments: Segment[] = []) {}

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

  public hasPrefix(path: Path): boolean {
    if (path.length() > this.length()) {
      return false
    } else {
      return path.segments.every((seg, i) => seg.equalTo(this.segments[i]))
    }
  }

  public concat(append: Path | Segment | string[]): Path {
    if (Array.isArray(append)) {
      return this.concat(Path.fromFields(append))
    } else if (append instanceof Segment) {
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
      return this.segments.slice(1).reduce((path, seg) => {
        if (seg instanceof Field) {
          return path + '.' + seg.toString()
        } else {
          return path + seg.toString()
        }
      }, this.segments[0].toString())
    }
  }

  public static fromFields(fields: string[]): Path {
    if (fields.length === 0) {
      return new Path()
    } else {
      return new Path(
        fields.map(f => {
          if (/^\.\d+$/.test(f)) {
            return new StaticOffset(parseInt(f.slice(1), 10))
          } else {
            return new Field(f.replace(/^\./, ''))
          }
        })
      )
    }
  }
}
