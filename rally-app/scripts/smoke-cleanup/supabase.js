function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function chunk(values, size = 100) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

async function runQuery(label, query) {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data || []
}

async function selectIn(client, table, columns, column, values) {
  if (values.length === 0) return []

  const rows = []
  for (const part of chunk(values)) {
    rows.push(...(await runQuery(`select ${table}`, client.from(table).select(columns).in(column, part))))
  }
  return rows
}

async function deleteIn(client, table, column, values) {
  if (values.length === 0) return

  for (const part of chunk(values)) {
    const { error } = await client.from(table).delete().in(column, part)
    if (error && error.code !== '42P01' && error.code !== '42703') {
      throw new Error(`delete ${table}.${column}: ${error.message}`)
    }
  }
}

async function deleteArrayContains(client, table, column, values) {
  for (const value of values) {
    const { error } = await client.from(table).delete().contains(column, [value])
    if (error && error.code !== '42P01' && error.code !== '42703') {
      throw new Error(`delete ${table}.${column} contains: ${error.message}`)
    }
  }
}

module.exports = {
  deleteArrayContains,
  deleteIn,
  runQuery,
  selectIn,
  unique,
}
