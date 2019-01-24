import Type from '~/types'

export class TypeUnionError {
  public readonly message: string

  constructor(public readonly t1: Type, public readonly t2: Type) {
    this.message = `unable to intersect ${t1.toString()} with ${t2.toString()}`
  }
}
