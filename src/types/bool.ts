import Type from '~/types'

export default class Bool extends Type {
  public readonly name = 'bool'

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
