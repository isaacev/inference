import Segment from '~/paths/segments'

export default abstract class Offset extends Segment {}

export class DynamicOffset extends Offset {
  public hasIndex() {
    return false as const
  }

  public equalTo(other: Segment): boolean {
    if (other instanceof DynamicOffset) {
      return true
    } else {
      return false
    }
  }

  public toJSON(): { segment: 'offset' } {
    return {
      segment: 'offset',
    }
  }

  public toString() {
    return '[*]'
  }
}

export class StaticOffset extends Offset {
  constructor(public readonly offset: number) {
    super()
  }

  public equalTo(other: Segment): boolean {
    if (other instanceof StaticOffset) {
      return this.offset === other.offset
    } else {
      return false
    }
  }

  public toJSON(): { segment: 'offset'; offset: number } {
    return {
      segment: 'offset',
      offset: this.offset,
    }
  }

  public toString() {
    return `[${this.offset}]`
  }
}
