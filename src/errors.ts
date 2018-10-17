import { Range, Point } from './points'

export class TemplateError extends Error {
  constructor(public range: Range | Point, message: string) {
    super(`${message} ${range.toString()}`)
  }
}

export class TemplateSyntaxError extends TemplateError {
  constructor(range: Range | Point, message: string) {
    super(range, message)
  }
}
