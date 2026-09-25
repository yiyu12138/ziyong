import { Widget, VStack, HStack, Text, Spacer, Script, Device, Storage, fetch } from 'scripting'

const SETTINGS_KEY = 'network-radar.settings.v1'
const CACHE_KEY = 'network-radar.cache.v1'

type Probe = { ok: boolean; status: number; text: string; ms: number }
type Service = { name: string; ok: boolean }
type Exit = {
  ip: string
  city: string
  country: string
  countryCode: string
  isp: string
  kind: string
  cloud: string
  flags: { proxy?: boolean; vpn?: boolean; tor?: boolean; abuser?: boolean; datacenter?: boolean; hosting?: boolean; cloud?: boolean; mobile?: boolean; residential?: boolean; risk?: number | null }
}
type Report = {
  localIP: string
  hasV4: boolean
  hasV6: boolean
  localMs: string
  exitIP: string
  place: string
  isp: string
  kind: string
  cloud: string
  proxyMs: string
  nat: string
  quic: string
  protocol: string
  purity: number
  risk: string
  media: Service[]
  ai: Service[]
  updatedAt: number
  note: string
}

const MEDIA = [
  ['Netflix', 'https://www.netflix.com/title/81215567'],
  ['Disney+', 'https://www.disneyplus.com/'],
  ['Spotify', 'https://open.spotify.com/'],
  ['TikTok', 'https://www.tiktok.com/'],
  ['YouTube', 'https://www.youtube.com/'],
  ['Prime', 'https://www.primevideo.com/'],
]
const AI = [
  ['ChatGPT', 'https://chatgpt.com/'],
  ['Claude', 'https://claude.ai/'],
  ['Gemini', 'https://gemini.google.com/'],
  ['DeepSeek', 'https://chat.deepseek.com/'],
  ['Grok', 'https://grok.com/'],
  ['Perplexity', 'https://www.perplexity.ai/'],
]

function clean(value: any) {
  return String(value == null ? '' : value).trim()
}

function maskIP(value: string) {
  const parts = clean(value).split('.')
  if (parts.length !== 4) return value || '未识别'
  return parts[0] + '.' + parts[1] + '.*.*'
}

async function httpGet(url: string, timeout = 4): Promise<Probe> {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      timeout,
      allowInsecureRequest: url.startsWith('http://'),
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
        Accept: 'application/json,text/plain,text/html,*/*',
        'Cache-Control': 'no-cache',
      },
    })
    return {
      ok: response.status >= 200 && response.status < 500,
      status: response.status,
      text: (await response.text()) || '',
      ms: Math.max(1, Date.now() - started),
    }
  } catch {
    return { ok: false, status: 0, text: '', ms: Math.max(1, Date.now() - started) }
  }
}

function jsonOf(probe: Probe) {
  if (!probe.ok || !probe.text) return null
  try { return JSON.parse(probe.text) } catch { return null }
}

function pick(...values: any[]) {
  for (const value of values) {
    if (value != null && clean(value) !== '') return value
  }
  return ''
}

function flag(code: string) {
  const value = clean(code).toUpperCase()
  if (!/^[A-Z]{2}$/.test(value)) return '🌐'
  return String.fromCodePoint(value.charCodeAt(0) + 127397) + String.fromCodePoint(value.charCodeAt(1) + 127397)
}

function localAddress() {
  let v4 = ''
  let v6 = false
  try {
    const interfaces = Device.networkInterfaces() || {}
    for (const name of Object.keys(interfaces)) {
      for (const item of interfaces[name] || []) {
        if (!item || item.isInternal) continue
        if (item.family === 'IPv4' && !v4) v4 = item.address
        if (item.family === 'IPv6' && item.address && !item.address.startsWith('fe80')) v6 = true
      }
    }
  } catch {}
  return { ip: v4 || '未获取', hasV4: Boolean(v4), hasV6: v6 }
}

function cloudName(text: string) {
  const value = text.toLowerCase()
  const providers = [['oracle', 'Oracle'], ['amazon', 'AWS'], ['aws', 'AWS'], ['google', 'Google'], ['microsoft', 'Azure'], ['azure', 'Azure'], ['digitalocean', 'DigitalOcean'], ['vultr', 'Vultr'], ['linode', 'Linode'], ['hetzner', 'Hetzner'], ['cloudflare', 'Cloudflare']]
  for (const [needle, name] of providers) {
    if (value.includes(needle)) return name
  }
  return ''
}

function parseExit(data: any): Exit | null {
  if (!data || typeof data !== 'object') return null
  const ip = clean(pick(data.query, data.ip, data.ip_address))
  if (!ip) return null
  const isp = clean(pick(data.isp, data.org, data.asname, data.organization, data.connection?.isp, data.company?.name, '未知组织'))
  const cloud = cloudName([isp, data.org, data.as, data.asname].join(' '))
  const flags = {
    datacenter: Boolean(data.hosting || data.is_datacenter || data.company?.is_datacenter || cloud),
    hosting: Boolean(data.hosting || data.is_hosting || cloud),
    cloud: Boolean(cloud),
    proxy: Boolean(data.proxy || data.is_proxy || data.security?.is_proxy),
    vpn: Boolean(data.is_vpn || data.security?.is_vpn),
    tor: Boolean(data.is_tor || data.security?.is_tor),
    abuser: Boolean(data.is_abuser || data.security?.is_abuser),
    mobile: Boolean(data.mobile || data.is_mobile),
    residential: /isp|residential|broadband/i.test(clean(data.connection?.type || data.company?.type || data.asn?.type)),
    risk: Number.isFinite(Number(data.risk ?? data.security?.risk)) ? Number(data.risk ?? data.security?.risk) : null,
  }
  const kind = flags.mobile ? '移动网络' : flags.residential ? '住宅 IP' : flags.datacenter || flags.hosting || flags.cloud ? '商业机房' : flags.proxy || flags.vpn ? '住宅 IP' : '未知网络'
  const code = clean(pick(data.countryCode, data.country_code)).toUpperCase()
  return {
    ip,
    city: clean(pick(data.city, data.regionName, data.region, '未知地区')),
    country: clean(pick(data.country, data.country_name)),
    countryCode: /^[A-Z]{2}$/.test(code) ? code : '',
    isp,
    kind,
    cloud,
    flags,
  }
}

function purityOf(exit: Exit) {
  let score = exit.kind === '住宅 IP' || exit.kind === '移动网络' ? 92 : exit.kind === '商业机房' ? 78 : 72
  const f = exit.flags
  if (f.tor) score -= 55
  if (f.abuser) score -= 35
  if (f.proxy && f.vpn) score -= 30
  else if (f.proxy || f.vpn) score -= 16
  if ((f.risk || 0) >= 80) score -= 25
  else if ((f.risk || 0) >= 40) score -= 10
  if (f.datacenter || f.hosting || f.cloud) score -= 8
  score = Math.max(0, Math.min(100, Math.round(score)))
  const risk = f.tor || f.abuser || score < 45 ? '高风险' : score < 75 || f.datacenter || f.proxy || f.vpn ? '中风险' : '低风险'
  return { score, risk }
}

function natLabel(localIP: string, exitIP: string) {
  const parts = localIP.split('.').map(Number)
  if (parts.length === 4 && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return 'CGNAT'
  const privateIP = parts.length === 4 && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168))
  return privateIP && exitIP && exitIP !== '未识别' ? 'Open' : '未知'
}

async function bestLatency(urls: string[]) {
  const results = await Promise.all(urls.map((url) => httpGet(url + '?_=' + Date.now(), 3)))
  const passed = results.filter((item) => item.ok && item.status < 400).sort((a, b) => a.ms - b.ms)
  return passed[0] ? passed[0].ms + 'ms' : '失败'
}

async function serviceRow(name: string, url: string): Promise<Service> {
  const result = await httpGet(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), 4)
  return { name, ok: result.ok && result.status < 500 }
}

async function diagnose(protocol: string): Promise<Report> {
  const local = localAddress()
  const [ipapi, ipapiCom, who] = await Promise.all([
    httpGet('https://api.ipapi.is/?_=' + Date.now(), 4),
    httpGet('http://ip-api.com/json/?lang=zh-CN&fields=status,query,country,countryCode,regionName,city,isp,org,as,asname,proxy,hosting,mobile&_=' + Date.now(), 4),
    httpGet('https://ipwho.is/?lang=zh-CN&_=' + Date.now(), 4),
  ])
  const exit = parseExit(jsonOf(ipapi)) || parseExit(jsonOf(ipapiCom)) || parseExit(jsonOf(who)) || {
    ip: '未识别', city: '出口检测失败', country: '', countryCode: '', isp: '未知组织', kind: '未知网络', cloud: '', flags: {},
  }
  const [localMs, proxyMs, quicProbe, media, ai] = await Promise.all([
    bestLatency(['https://www.baidu.com/favicon.ico', 'https://www.qq.com/favicon.ico']),
    bestLatency(['https://cp.cloudflare.com/generate_204', 'https://www.gstatic.com/generate_204']),
    httpGet('https://cloudflare.com/cdn-cgi/trace?_=' + Date.now(), 4),
    Promise.all(MEDIA.map(([name, url]) => serviceRow(name, url))),
    Promise.all(AI.map(([name, url]) => serviceRow(name, url))),
  ])
  const http = clean((quicProbe.text.match(/^http=(.+)$/m) || [])[1]).toLowerCase()
  const quic = http.includes('h3') || http.includes('http/3') ? '✓/✓' : quicProbe.ok ? '×/×' : '失败'
  const purity = purityOf(exit)
  return {
    localIP: local.ip,
    hasV4: local.hasV4,
    hasV6: local.hasV6,
    localMs,
    exitIP: exit.ip,
    place: [flag(exit.countryCode), exit.city || exit.country || '未知地区'].filter(Boolean).join(' '),
    isp: exit.isp || '未知组织',
    kind: exit.kind,
    cloud: exit.cloud || (exit.kind === '住宅 IP' ? '原生住宅' : exit.kind === '商业机房' ? '商业机房' : '出口网络'),
    proxyMs,
    nat: natLabel(local.ip, exit.ip),
    quic,
    protocol: protocol || '未暴露',
    purity: purity.score,
    risk: purity.risk,
    media,
    ai,
    updatedAt: Date.now(),
    note: '系统网络',
  }
}

function tone(value: string) {
  if (value === '失败' || value === '高风险' || value === '×/×') return 'systemRed'
  if (value === '中风险' || value === 'CGNAT') return 'systemOrange'
  return 'systemGreen'
}

function Chip({ item }: { item: Service }) {
  return <Text font="caption2" fontWeight="semibold" foregroundStyle={item.ok ? 'systemGreen' : 'systemRed'}>{item.ok ? '✓' : '×'}{item.name}</Text>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <VStack alignment="center" spacing={0}>
      <Text font="caption2" fontWeight="bold" foregroundStyle={tone(value)}>{value}</Text>
      <Text font="caption2" foregroundStyle="secondaryLabel">{label}</Text>
    </VStack>
  )
}

function View({ report, mask }: { report: Report; mask: boolean }) {
  const family = String(Widget.family || '')
  const small = family === 'systemSmall' || family.indexOf('accessory') === 0
  const time = new Date(report.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const ip = mask ? maskIP(report.exitIP) : report.exitIP
  const localIP = mask ? maskIP(report.localIP) : report.localIP
  if (small) {
    return (
      <VStack alignment="leading" spacing={2}>
        <Text font="caption" fontWeight="bold">网络诊断雷达</Text>
        <Text font="caption2">{report.place}</Text>
        <Text font="caption2" foregroundStyle="secondaryLabel">{ip}</Text>
        <Text font="caption2" foregroundStyle={tone(report.risk)}>{report.purity}分 · {report.risk}</Text>
        <Text font="caption2" foregroundStyle="secondaryLabel">{report.proxyMs} · {time}</Text>
      </VStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={4} padding={8}>
      <HStack>
        <Text font="caption" fontWeight="bold">网络诊断雷达</Text>
        <Spacer />
        <Text font="caption2" foregroundStyle="secondaryLabel">{report.note} · {time}</Text>
      </HStack>
      <HStack>
        <VStack alignment="leading" spacing={1}>
          <Text font="caption2" foregroundStyle="secondaryLabel">本地 {localIP}</Text>
          <Text font="caption2">IPv4/6 {report.hasV4 ? '✓' : '×'}/{report.hasV6 ? '✓' : '×'} · {report.localMs}</Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={1}>
          <Text font="caption2" fontWeight="semibold">{report.place}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">{ip}</Text>
        </VStack>
      </HStack>
      <HStack>
        <Metric label="延迟" value={report.proxyMs} />
        <Metric label="NAT" value={report.nat} />
        <Metric label="QUIC" value={report.quic} />
        <Metric label="协议" value={report.protocol} />
      </HStack>
      <Text font="caption2" foregroundStyle="secondaryLabel">{report.isp} · {report.kind} · {report.cloud}</Text>
      <HStack spacing={4}>{report.media.map((item) => <Chip item={item} />)}</HStack>
      {family === 'systemLarge' ? <HStack spacing={4}>{report.ai.map((item) => <Chip item={item} />)}</HStack> : null}
      <HStack>
        <Text font="caption2" fontWeight="bold" foregroundStyle={tone(report.risk)}>{report.purity}分 · {report.risk}</Text>
        <Spacer />
        <Text font="caption2" foregroundStyle="secondaryLabel">{family === 'systemLarge' ? '含 AI 检测' : '大号可看 AI'}</Text>
      </HStack>
    </VStack>
  )
}

async function main() {
  const settings = Storage.get<{ maskIP?: boolean; protocol?: string }>(SETTINGS_KEY, { shared: true }) || {}
  const cached = Storage.get<Report>(CACHE_KEY, { shared: true })
  let report: Report
  try {
    report = await diagnose(clean(settings.protocol))
    Storage.set(CACHE_KEY, report, { shared: true })
  } catch {
    report = cached || {
      localIP: '未获取', hasV4: false, hasV6: false, localMs: '失败', exitIP: '未识别', place: '检测失败',
      isp: '未知组织', kind: '未知网络', cloud: '', proxyMs: '失败', nat: '未知', quic: '失败',
      protocol: clean(settings.protocol) || '未暴露', purity: 0, risk: '高风险', media: [], ai: [],
      updatedAt: Date.now(), note: '系统网络',
    }
  }

  Widget.present(<View report={report} mask={settings.maskIP === true} />, {
    policy: 'after',
    date: new Date(Date.now() + 15 * 60 * 1000),
  })
  Script.exit()
}

main()
