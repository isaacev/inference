import Type from '~/types'
import Unknown from '~/types/unknown'

export default class Dict extends Type {
  public readonly name = 'dict'

  constructor(public readonly fields: { name: string; type: Type }[] = []) {
    super()
  }

  public fieldNames() {
    return this.fields.map(pair => pair.name)
  }

  public hasField(name: string): boolean {
    return this.fields.some(field => field.name === name)
  }

  public getField(name: string): Type {
    for (const field of this.fields) {
      if (field.name === name) {
        return field.type
      }
    }
    return new Unknown()
  }

  public intersect(that: Type): Type {
    if (that instanceof Dict) {
      const thisNames = this.fields.map(field => field.name)
      const thatNames = that.fields.map(field => field.name)
      const uniqueNames = thisNames
        .concat(thatNames)
        .filter((name, index, self) => self.indexOf(name) === index)
      return new Dict(
        uniqueNames.map(name => ({
          name,
          type: this.getField(name).intersect(that.getField(name)),
        }))
      )
    }

    return super.intersect(that)
  }

  public toJSON() {
    return { type: 'dict', pairs: this.fields }
  }

  public toString() {
    return `{ ${this.fields
      .map(pair => `${pair.name}:${pair.type} `)
      .join('')}}`
  }
}
