import Type from '~/types'
import Unknown from '~/types/unknown'
import List from '~/types/list'

export default class Tuple extends Type {
  public readonly name = 'tuple'

  constructor(public readonly members: Type[] = []) {
    super()
  }

  public memberAt(index: number): Type {
    if (index < this.length()) {
      return this.members[index]
    } else {
      return new Unknown()
    }
  }

  public length(): number {
    return this.members.length
  }

  public intersect(that: Type): Type {
    if (that instanceof List) {
      const element = this.members.reduce((acc, member) => {
        return acc.intersect(member)
      }, that.element)
      const minLength = Math.max(that.minLength, this.length())
      return new List(element, minLength)
    }

    if (that instanceof Tuple) {
      const members = repeat(Math.max(this.length(), that.length()), index => {
        return this.memberAt(index).intersect(that.memberAt(index))
      })
      return new Tuple(members)
    }

    return super.intersect(that)
  }

  public toJSON() {
    return { type: 'tuple', members: this.members }
  }

  public toString(): string {
    return `Tuple<${this.members.map(m => m.toString()).join(', ')}>`
  }
}

const repeat = <T>(max: number, fn: (n: number) => T): T[] => {
  const vals = [] as T[]
  for (let i = 0; i < max; i++) {
    vals.push(fn(i))
  }
  return vals
}
