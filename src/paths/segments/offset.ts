import Segment from '~/paths/segments'

export default class Offset extends Segment {
  constructor(public readonly offset?: number) {
    super()
  }

  public hasIndex(): boolean {
    return typeof this.offset === 'number'
  }

  public equalTo(other: Segment): boolean {
    if (other instanceof Offset) {
      return this.offset === other.offset
    } else {
      return false
    }
  }

  public toString() {
    if (this.hasIndex()) {
      return `[${this.offset}]`
    } else {
      return '[*]'
    }
  }

  public toJSON(): { segment: 'offset'; offset?: number } {
    return {
      segment: 'offset',
      offset: this.offset,
    }
  }
}
