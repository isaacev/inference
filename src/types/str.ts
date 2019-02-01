import Type from '~/types'

export default class Str extends Type {
  public readonly name = 'str'

  public intersect(that: Type): Type {
    if (that instanceof Str) {
      return new Str()
    }

    return super.intersect(that)
  }

  public toJSON() {
    return { type: 'str' }
  }

  public toString(): string {
    return 'Str'
  }
}
