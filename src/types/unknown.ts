import Type from '~/types'

export default class Unknown extends Type {
  public accepts(): boolean {
    return true
  }

  public intersect(that: Type): Type {
    return that
  }

  public toJSON() {
    return { type: 'unknown' }
  }

  public toString() {
    return 'Unknown'
  }
}
