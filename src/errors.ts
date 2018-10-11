import { Range, Point } from './syntax'

export class TemplateError {
  constructor(public range: Range | Point, public message: string) {}
}

export class TemplateSyntaxError extends TemplateError {
  constructor(range: Range | Point, message: string) {
    super(range, message)
  }
}
