const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyeXOuaukZcG-k5klYCQGo_zDQzCV1iSM9PljAqddBo8CxhO_3xxmXUnUnCZREaAoZ13Q/exec"

const VA_NAMES = ["Cara", "Micaella", "Melrose", "Jessan"]

function formatImageUrl(url) {
  if (!url) return null
  let f = String(url).trim()
  if (!f) return null
  if (f.includes('dropbox.com')) {
    f = f.replace('dl=0', 'raw=1')
    if (!f.includes('raw=1') && !f.includes('dl=1')) f += (f.includes('?') ? '&' : '?') + 'raw=1'
  } else if (f.includes('drive.google.com/file/d/')) {
    const m = f.match(/\/d\/(.*?)\//)
    if (m && m[1]) f = 'https://drive.google.com/uc?export=view&id=' + m[1]
  }
  return f
}

function formatFolderLink(rawLink) {
  let link = String(rawLink || '').trim()
  if (link === 'null' || link === '') return null
  if (!link.startsWith('http://') && !link.startsWith('https://')) link = 'https://' + link
  return link
}

function escSql(val) {
  if (val === null || val === undefined) return 'NULL'
  return "'" + String(val).replace(/'/g, "''") + "'"
}

async function main() {
  console.log('Fetching agents from Google Sheets...\n')

  const response = await fetch(WEB_APP_URL)
  const data = await response.json()
  const raw = data.agents || []

  const agents = raw.filter(a => !VA_NAMES.some(v => String(a.Name || '').includes(v)))

  console.log(`Found ${agents.length} agents (excluding VA team already in DB).\n`)
  console.log('-- Copy everything below this line and run in Supabase SQL Editor:\n')
  console.log('INSERT INTO team_members (full_name, email, phone, photo_url, role, drive_folder_link) VALUES')

  const rows = agents.map(a => {
    const name = String(a.Name || '').trim()
    const email = String(a.Email || '').trim()
    const phone = String(a.Phone || a.PhoneNumber || '').trim() || null
    const photo = formatImageUrl(String(a.PhotoURL || a.Photo || a.PhotoUrl || ''))
    const folder = formatFolderLink(String(a.DriveLink || a.FolderLink || a.FilesLink || ''))

    return `  (${escSql(name)}, ${escSql(email)}, ${escSql(phone)}, ${escSql(photo)}, 'Agent', ${escSql(folder)})`
  })

  console.log(rows.join(',\n') + ';')
  console.log('\n-- Done! ' + agents.length + ' agents ready to insert.')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
