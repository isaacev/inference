import Type from '~/types'
import Unknown from '~/types/unknown'
import Tuple from '~/types/tuple'

export default class List extends Type {
  constructor(
    public readonly element: Type = new Unknown(),
    public readonly minLength: number = 0
  ) {
    super()
  }

  public accepts(that: Type): boolean {
    if (that instanceof List) {
      return this.element.accepts(that.element)
    }

    if (that instanceof Tuple) {
      return that.members.every(this.element.accepts.bind(this))
    }

    return super.accepts(that)
  }

  public intersect(that: Type): Type {
    if (that instanceof List) {
      const element = this.element.intersect(that.element)
      const minLength = Math.max(this.minLength, that.minLength)
      return new List(element, minLength)
    }

    if (that instanceof Tuple) {
      const element = that.members.reduce((element, member) => {
        return element.intersect(member)
      }, this.element)
      const minLength = Math.max(this.minLength, that.length())
      return new List(element, minLength)
    }

    return super.intersect(that)
  }

  public toJSON() {
    return { type: 'list', element: this.element }
  }

  public toString(): string {
    if (this.minLength === 0) {
      return `[${this.element.toString()}]`
    } else {
      return `[${this.element.toString()}; len >= ${this.minLength}]`
    }
  }
}
