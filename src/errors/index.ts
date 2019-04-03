import { Report } from '~/errors/report'

export default class TemplateError {
  public message: string

  constructor(public report: Report) {
    const { line, column } = this.report.where.start
    this.message = `${this.report.title} at (${line}:${column})`
  }
}
