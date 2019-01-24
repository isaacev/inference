import Type from '~/types'

export default class Num extends Type {
  public accepts(that: Type): boolean {
    if (that instanceof Num) {
      return true
    }

    return super.accepts(that)
  }

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
