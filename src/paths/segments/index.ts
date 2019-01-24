export default abstract class Segment {
  public abstract equalTo(other: Segment): boolean
  public abstract toJSON(): { segment: 'offset' | 'field' }
  public abstract toString(): string
}
