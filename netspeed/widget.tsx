import { Widget, VStack, HStack, Text, Spacer, Image, Script, fetch, Button, modifiers } from 'scripting'
import { RefreshNetSpeedIntent } from './app_intents'

const CACHE_KEY = 'netspeed.cache.v2'
const TUNNEL_KEY = 'netspeed.tunnel.v1'

const DOWN_URL = 'https://speed.cloudflare.com/__down?bytes=26214400'
const WARMUP_URL = 'https://speed.cloudflare.com/__down?bytes=1048576'
const GEO_URL = 'http://ip-api.com/json/?fields=status,countryCode,query'

async function drain(response: any, limitMs: number) {
  const started = Date.now()
  let total = 0
  try {
    const reader = response.body?.getReader?.()
    if (reader) {
      while (Date.now() - started < limitMs) {
        const step = await reader.read()
        if (step.done) break
        total += step.value?.byteLength || 0
      }
      try { reader.cancel?.() } catch {}
      return { bytes: total, ms: Math.max(1, Date.now() - started) }
    }
  } catch {}
  const data = await response.data()
  total = Number(data?.byteLength || data?.length || 0)
  return { bytes: total, ms: Math.max(1, Date.now() - started) }
}

async function warmUp() {
  try {
    const response = await fetch(WARMUP_URL, { timeout: 6, headers: { 'Cache-Control': 'no-cache' } })
    await drain(response, 3000)
  } catch {}
}

async function detectTunnel() {
  const tryOne = async (url: string) => {
    const response = await fetch(url, { timeout: 8, headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' } })
    const text = (await response.text()) || ''
    const data = JSON.parse(text)
    const code = String(data?.countryCode || data?.country_code || data?.country || '').toUpperCase()
    return code
  }
  let code = ''
  try {
    code = await tryOne(GEO_URL)
  } catch {
    try {
      code = await tryOne('https://ipwho.is/')
    } catch {
      code = ''
    }
  }
  // 出口不在中国大陆，就认为当前走了代理/VPN。
  if (!code) return null
  return code !== 'CN'
}

async function measure() {
  const response = await fetch(DOWN_URL, {
    timeout: 20,
    headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' },
  })
  if (response.status < 200 || response.status >= 400) throw new Error('HTTP ' + response.status)
  const { bytes, ms } = await drain(response, 10000)
  if (!bytes) throw new Error('没有收到数据')
  const mBs = bytes / 1024 / 1024 / (ms / 1000)
  return {
    mbps: Number((mBs * 8).toFixed(1)),
    mBs: Number(mBs.toFixed(2)),
    bytes,
    duration: (ms / 1000).toFixed(2),
    timestamp: Date.now(),
    stale: false,
  }
}

const PURPLE = '#7446D8'

function tone(mbps: number) {
  if (mbps >= 50) return { icon: 'bolt.fill', color: PURPLE }
  if (mbps >= 10) return { icon: 'hare.fill', color: PURPLE }
  return { icon: 'tortoise.fill', color: PURPLE }
}

function View({ local, vpn, tunnel }: { local: any; vpn: any; tunnel: boolean }) {
  const family = String(Widget.family || '')
  const small = family === 'systemSmall'
  const current = tunnel ? vpn : local
  const look = tone(Number(current?.mbps) || 0)
  const time = new Date(current?.timestamp || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const width = Math.max(72, Math.round((Widget.displaySize?.width || 160) - 36))
  const fill = Math.max(10, Math.round(width * Math.min(1, (Number(current?.mbps) || 0) / 100)))
  const label = tunnel ? 'VPN' : '本地'
  return (
    <Button
      intent={RefreshNetSpeedIntent(undefined)}
      buttonStyle="plain"
      modifiers={modifiers().frame({ maxWidth: 'infinity', maxHeight: 'infinity' })}
    >
      <VStack alignment="center" spacing={small ? 6 : 8} padding={small ? 12 : 16} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <HStack>
          <Image systemName={look.icon} resizable scaleToFit frame={{ width: 14, height: 14 }} foregroundStyle={look.color} />
          <Text font="caption2" fontWeight="semibold" foregroundStyle={look.color}>{label}网速</Text>
          <Spacer />
          <Text font="caption2" foregroundStyle="secondaryLabel">{current?.stale ? '上次 ' : ''}{time}</Text>
        </HStack>
        <Spacer />
        <Text font={small ? 'title' : 'largeTitle'} fontWeight="bold" foregroundStyle={look.color}>{current?.mbps || 0} Mbps</Text>
        <HStack spacing={0} frame={{ width, height: 4 }} background={{ light: '#E8E8ED', dark: '#202025' }} clipShape={{ type: 'rect', cornerRadius: 2 }}>
          <HStack frame={{ width: fill, height: 4 }} background={look.color} />
        </HStack>
        <HStack frame={{ width }}>
          <Text font="caption2" foregroundStyle="secondaryLabel">{current?.mBs || 0} MB/s</Text>
          <Spacer />
          <Text font="caption2" foregroundStyle="secondaryLabel">{current?.duration || 0}s</Text>
        </HStack>
        {small ? null : (
          <HStack frame={{ width }}>
            <Text font="caption2" foregroundStyle={tunnel ? 'secondaryLabel' : 'primary'}>本地 {local?.mbps || '--'}</Text>
            <Spacer />
            <Text font="caption2" foregroundStyle={tunnel ? 'primary' : 'secondaryLabel'}>VPN {vpn?.mbps || '--'}</Text>
          </HStack>
        )}
        <Spacer />
      </VStack>
    </Button>
  )
}

async function main() {
  const cached = Storage.get<any>(CACHE_KEY, { shared: true }) || {}
  let local = cached.local || null
  let vpn = cached.vpn || null
  let tunnel = Storage.get<boolean>(TUNNEL_KEY, { shared: true }) === true
  try {
    const detected = await detectTunnel()
    if (detected !== null) {
      tunnel = detected
      Storage.set(TUNNEL_KEY, tunnel, { shared: true })
    }
    await warmUp()
    const result = await measure()
    if (tunnel) vpn = result
    else local = result
    Storage.set(CACHE_KEY, { local, vpn }, { shared: true })
  } catch {
    if (local) local = { ...local, stale: true }
    if (vpn) vpn = { ...vpn, stale: true }
  }
  Widget.present(<View local={local} vpn={vpn} tunnel={tunnel} />, {
    supportedFamilies: ['systemSmall', 'systemMedium'],
    reloadPolicy: { policy: 'after', date: new Date(Date.now() + 30 * 60 * 1000) },
  })
  Script.exit()
}

main()
