import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const appRoot = fileURLToPath(new URL('../..', import.meta.url))
const scanRoots = [join(appRoot, 'app'), join(appRoot, 'components')]

const allowedOnSaveStartedExpressions = new Map<string, ReadonlySet<string>>([
  [
    'components/coach/BasketballCoachReportView.tsx',
    new Set(['(input)=>setOptimisticContext(input)', 'onSaveStarted']),
  ],
  [
    'components/coach/CoachAnalysisEntryModal.tsx',
    new Set(['onSaveStarted']),
  ],
])

const navigationPatterns = [
  /\brouter\.(push|replace|back)\b/,
  /\bnavigation\.(navigate|push|replace|goBack)\b/,
  /\bLinking\.openURL\b/,
]

type PropUse = {
  file: string
  expression: string
}

describe('coach save callback lifecycle', () => {
  it('keeps onSaveStarted limited to optimistic state and never navigation', () => {
    const uses = sourceFiles(scanRoots).flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return findJsxPropExpressions(source, 'onSaveStarted').map((expression) => ({
        file: normalizePath(relative(appRoot, file)),
        expression,
      }))
    })

    const unexpected = uses.filter((use) => {
      const allowed = allowedOnSaveStartedExpressions.get(use.file)
      return !allowed?.has(normalizeExpression(use.expression))
    })
    const navigationUses = uses.filter((use) =>
      navigationPatterns.some((pattern) => pattern.test(use.expression)),
    )

    expect(unexpected).toEqual([])
    expect(navigationUses).toEqual([])
  })
})

function sourceFiles(roots: string[]): string[] {
  return roots.flatMap((root) => walk(root))
}

function walk(path: string): string[] {
  const stats = statSync(path)
  if (stats.isFile()) {
    if (path.endsWith('.test.ts') || path.endsWith('.test.tsx')) return []
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : []
  }
  return readdirSync(path).flatMap((entry) => walk(join(path, entry)))
}

function findJsxPropExpressions(source: string, propName: string): string[] {
  const expressions: string[] = []
  const needle = `${propName}={`
  let from = 0
  while (from < source.length) {
    const propStart = source.indexOf(needle, from)
    if (propStart === -1) break
    const expressionStart = propStart + needle.length
    const expressionEnd = findMatchingBrace(source, expressionStart)
    if (expressionEnd !== -1) {
      expressions.push(source.slice(expressionStart, expressionEnd))
      from = expressionEnd + 1
    } else {
      from = expressionStart
    }
  }
  return expressions
}

function findMatchingBrace(source: string, expressionStart: number): number {
  let depth = 1
  let quote: '"' | "'" | '`' | null = null
  let escaped = false

  for (let index = expressionStart; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) return index
  }
  return -1
}

function normalizeExpression(expression: string): string {
  return expression.replace(/\s+/g, '')
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}
