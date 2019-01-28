export default abstract class Type {
  public abstract readonly name: string

  public accepts(that: Type): boolean {
    return false
  }

  public intersect(that: Type): Type {
    // Uses the `Type#toString()` method instead of `instanceof` because the
    // Unknown type cannot be used by its parent class. If the parent & child
    // classes depend on eachother there's no correct initialization order.
    if (that.toString() === 'Unknown') {
      return this
    } else {
      const s1 = this.toString()
      const s2 = that.toString()
      throw new Error(`unable to combine ${s1} with ${s2}`)
    }
  }

  public abstract toJSON(): { type: string }

  public abstract toString(): string
}
