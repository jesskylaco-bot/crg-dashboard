const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyeXOuaukZcG-k5klYCQGo_zDQzCV1iSM9PljAqddBo8CxhO_3xxmXUnUnCZREaAoZ13Q/exec"

const STAGE_MAP = {
  'closed': 'closed',
  'pending': 'pending',
  'under contract': 'under_contract',
  'active': 'active',
  'lost': 'lost',
  'withdrawn': 'withdrawn',
  'lead': 'lead',
  'offer': 'offer_stage',
  'closing': 'closing',
  'archived': 'archived',
}

function mapStage(raw) {
  const s = String(raw || '').toLowerCase().trim()
  for (const [key, val] of Object.entries(STAGE_MAP)) {
    if (s.includes(key)) return val
  }
  return 'active'
}

function escSql(val) {
  if (val === null || val === undefined) return 'NULL'
  return "'" + String(val).replace(/'/g, "''") + "'"
}

function parsePrice(val) {
  if (!val) return 'NULL'
  const num = Number(String(val).replace(/[$,\s]/g, ''))
  return isNaN(num) ? 'NULL' : String(num)
}

async function main() {
  console.log('Fetching transactions from Google Sheets...\n')

  const response = await fetch(WEB_APP_URL)
  const data = await response.json()
  const raw = data.transactions || []

  console.log(`Found ${raw.length} transactions.\n`)

  if (raw.length === 0) {
    console.log('No transactions to migrate.')
    return
  }

  console.log('-- Copy everything below this line and run in Supabase SQL Editor:\n')
  console.log('INSERT INTO transactions (property_address, client_name, agent_id, stage, price) VALUES')

  const rows = raw.map(t => {
    const clientName = String(t.ClientName || t.Client || 'Unknown').trim()
    const address = String(t.Address || t.PropertyAddress || '').trim()
    const agentName = String(t.AgentName || t.Agent || '').trim()
    const stage = mapStage(t.Stage || t.Status)
    const price = parsePrice(t.Price)

    const agentLookup = agentName
      ? `(SELECT id FROM team_members WHERE full_name = ${escSql(agentName)} LIMIT 1)`
      : 'NULL'

    return `  (${escSql(address)}, ${escSql(clientName)}, ${agentLookup}, ${escSql(stage)}, ${price})`
  })

  console.log(rows.join(',\n') + ';')
  console.log('\n-- Done! ' + raw.length + ' transactions ready to insert.')
  console.log('-- Note: If an agent name doesn\'t match a team_member exactly, agent_id will be NULL.')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
