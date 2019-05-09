import { Text, Inline, Block, Clause, Statement } from '~/syntax'
import {
  TextChunk,
  Chunk,
  toChunks,
  InlineChunk,
  PathChunk,
  BlockOpenChunk,
  BlockClauseChunk,
  BlockCloseChunk,
} from '~/syntax/chunks'
import Path from '~/paths'
import { StaticOffset } from '~/paths/segments/offset'
import Field from '~/paths/segments/field'
import TemplateError from '~/errors'
import * as errors from '~/syntax/errors'

export const toStatements = (template: string): Statement[] => {
  const chunks = toChunks(template)
  return parseStatements(chunks)
}

const parseStatements = (remaining: Chunk[]): Statement[] => {
  const collected = [] as Statement[]
  while (remaining.length > 0) {
    switch (remaining[0].chunk) {
      case 'text': {
        const chunk = remaining.shift() as TextChunk
        collected.push(parseText(chunk))
        break
      }
      case 'inline': {
        const chunk = remaining.shift() as InlineChunk
        collected.push(parseInline(chunk))
        break
      }
      case 'block-open': {
        const chunk = remaining.shift() as BlockOpenChunk
        collected.push(parseBlock(chunk, remaining))
        break
      }
      default:
        return collected
    }
  }
  return collected
}

const parseText = (chunk: TextChunk): Text => {
  return {
    statement: 'text',
    text: chunk.text,
    location: chunk.location,
  }
}

const parseInline = (chunk: InlineChunk): Inline => {
  const name = { value: chunk.name.text, location: chunk.name.location }
  const path = { value: parsePath(chunk.path), location: chunk.path.location }
  const location = chunk.location
  return {
    statement: 'inline',
    name,
    path,
    location,
  }
}

const parseBlock = (open: BlockOpenChunk, remaining: Chunk[]): Block => {
  const statements = parseStatements(remaining)
  const name = { value: open.name.text, location: open.name.location }
  const path = { value: parsePath(open.path), location: open.path.location }
  const start = open.location.start

  const clauses = [] as Clause[]
  while (remaining.length > 0 && remaining[0].chunk === 'block-clause') {
    const open = remaining.shift() as BlockClauseChunk
    const name = { value: open.name.text, location: open.name.location }
    const start = open.location.start
    const statements = parseStatements(remaining)
    const end =
      statements.length > 0
        ? statements[statements.length - 1].location.end
        : open.location.end
    const location = { start, end }
    clauses.push({ name, statements, location })
  }

  if (remaining.length === 0) {
    const lastClauseEnding =
      clauses.length > 0 ? clauses[clauses.length - 1].location.end : undefined
    const lastStmtEnding =
      statements.length > 0
        ? statements[statements.length - 1].location.end
        : undefined
    const openEnding = open.location.end
    const point = lastClauseEnding || lastStmtEnding || openEnding
    throw errors.unclosedBlockError({
      blockName: open.name.text,
      where: { start: point, end: point },
      template: '',
    })
  }

  const close = remaining.shift() as BlockCloseChunk
  if (close.name.text !== open.name.text) {
    throw errors.mismatchedClosingTag({
      wantedName: open.name.text,
      foundName: close.name.text,
      where: close.name.location,
      template: '',
    })
  }

  const end = close.location.end
  return {
    statement: 'block',
    name,
    path,
    statements,
    clauses,
    location: { start, end },
  }
}

const parsePath = (syntax: PathChunk): Path => {
  if (syntax.type === 'root') {
    return new Path()
  } else {
    return new Path(
      syntax.segments.map(seg => {
        switch (seg.type) {
          case 'offset':
            return new StaticOffset(seg.value)
          case 'field':
            return new Field(seg.field.text)
        }
      })
    )
  }
}
