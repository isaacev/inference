import Type from '~/types'

export default class Num extends Type {
  public readonly name = 'num'

  public intersect(that: Type): Type {
    if (that instanceof Num) {
      return new Num()
    }

    return super.intersect(that)
  }

  public toJSON() {
    return { type: 'num' }
  }

  public toString(): string {
    return 'Num'
  }
}
