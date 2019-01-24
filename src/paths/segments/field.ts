import Segment from '~/paths/segments'

export default class Field extends Segment {
  constructor(public readonly name: string) {
    super()
  }

  public equalTo(other: Segment): boolean {
    return other instanceof Field && other.name === this.name
  }

  public toJSON(): { segment: 'field'; name: string } {
    return {
      segment: 'field',
      name: this.name,
    }
  }

  public toString() {
    return '.' + this.name
  }
}
