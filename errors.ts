import { Range, Point } from './lexer'

export abstract class TemplateError {
  constructor(public range: Range, public message: string) {}
}

export class TemplateSyntaxError extends TemplateError {
  constructor(range: Range, message: string) {
    super(range, message)
  }
}
