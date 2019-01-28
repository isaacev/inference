import Type from '~/types'

export default class Bool extends Type {
  public readonly name = 'bool'

  public accepts(that: Type): boolean {
    if (that instanceof Bool) {
      return true
    }

    return super.accepts(that)
  }

  public intersect(that: Type): Type {
    if (that instanceof Bool) {
      return new Bool()
    }

    return super.intersect(that)
  }

  public toJSON() {
    return { type: 'bool' }
  }

  public toString(): string {
    return 'Bool'
  }
}
