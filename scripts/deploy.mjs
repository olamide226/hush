import { execFileSync } from 'node:child_process'

const alias = process.env.VERCEL_ALIAS?.trim() || 'hush-qa.vercel.app'

const output = execFileSync(
  'vercel',
  ['deploy', '--prod', '--yes', '--non-interactive', '--json'],
  { encoding: 'utf8' },
)

const result = JSON.parse(output)
const deploymentUrl = result.deployment?.url ?? result.url

if (!deploymentUrl) {
  console.error('Could not read the deployment URL from Vercel.')
  process.exit(1)
}

execFileSync('vercel', ['alias', 'set', deploymentUrl, alias], {
  stdio: 'inherit',
})

console.log(`\nProduction: https://${alias}`)
console.log(`Deployment: ${deploymentUrl}\n`)
