import { Widget, VStack, HStack, Text, Spacer, Image, Script, fetch } from 'scripting'

const SETTINGS_KEY = 'network-radar.settings.v1'
const CACHE_KEY = 'network-radar.cache.v1'

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

async function probe(url: string) {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      timeout: 3,
      allowInsecureRequest: url.indexOf('http://') === 0,
      headers: { 'Cache-Control': 'no-cache', Accept: '*/*' },
    })
    return { ok: response.status >= 200 && response.status < 500, status: response.status, text: (await response.text()) || '', ms: Math.max(1, Date.now() - started) }
  } catch {
    return { ok: false, status: 0, text: '', ms: 0 }
  }
}

function readJSON(text: string) {
  try { return JSON.parse(text) } catch { return null }
}

function flag(code: string) {
  const value = clean(code).toUpperCase()
  if (!/^[A-Z]{2}$/.test(value)) return '🌐'
  return String.fromCodePoint(value.charCodeAt(0) + 127397) + String.fromCodePoint(value.charCodeAt(1) + 127397)
}

function maskIP(value: string) {
  const parts = clean(value).split('.')
  if (parts.length !== 4) return value || '--'
  return parts[0] + '.' + parts[1] + '.*.*'
}

function localAddress() {
  let v4 = ''
  let v6 = false
  try {
    const interfaces = Device.networkInterfaces() || {}
    Object.keys(interfaces).forEach((name) => {
      (interfaces[name] || []).forEach((item: any) => {
        if (!item || item.isInternal) return
        if (item.family === 'IPv4' && !v4) v4 = item.address
        if (item.family === 'IPv6' && item.address && String(item.address).indexOf('fe80') !== 0) v6 = true
      })
    })
  } catch {}
  return { ip: v4 || '--', hasV4: Boolean(v4), hasV6: v6 }
}

function natLabel(localIP: string, exitIP: string) {
  const parts = localIP.split('.').map(Number)
  if (parts.length === 4 && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return 'CGNAT'
  const privateIP = parts.length === 4 && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168))
  return privateIP && exitIP && exitIP !== '未识别' ? 'Open' : '未知'
}

function scoreOf(data: any) {
  let score = data.hosting ? 78 : data.mobile ? 92 : 86
  if (data.proxy) score -= 16
  if (data.hosting) score -= 8
  score = Math.max(0, Math.min(100, score))
  const risk = score < 45 ? '高风险' : score < 75 || data.hosting || data.proxy ? '中风险' : '低风险'
  return { score, risk }
}

async function checkService(name: string, url: string, code: string) {
  const result = await probe(url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now())
  return { name, ok: result.ok, code: result.ok ? code : '' }
}

async function diagnose(protocol: string) {
  const local = localAddress()
  const [exitProbe, localProbe, remoteProbe, quicProbe] = await Promise.all([
    probe('http://ip-api.com/json/?lang=zh-CN&fields=status,query,country,countryCode,regionName,city,isp,org,as,proxy,hosting,mobile&_=' + Date.now()),
    probe('https://www.baidu.com/favicon.ico?_=' + Date.now()),
    probe('https://cp.cloudflare.com/generate_204?_=' + Date.now()),
    probe('https://cloudflare.com/cdn-cgi/trace?_=' + Date.now()),
  ])
  const data = readJSON(exitProbe.text) || {}
  const code = clean(data.countryCode).toUpperCase()
  const http = clean((quicProbe.text.match(/^http=(.+)$/m) || [])[1]).toLowerCase()
  const scored = scoreOf(data)
  const [media, ai] = await Promise.all([
    Promise.all(MEDIA.map(([name, url]) => checkService(name, url, code))),
    Promise.all(AI.map(([name, url]) => checkService(name, url, code))),
  ])
  return {
    localIP: local.ip,
    hasV4: local.hasV4,
    hasV6: local.hasV6,
    localMs: localProbe.ok ? localProbe.ms + 'ms' : '失败',
    exitIP: clean(data.query) || '未识别',
    place: clean(data.city || data.regionName || data.country) || '未知地区',
    code,
    isp: clean(data.isp || data.org) || '未知组织',
    kind: data.hosting ? '商业机房' : data.mobile ? '移动网络' : data.proxy ? '代理出口' : '出口网络',
    proxyMs: remoteProbe.ok ? remoteProbe.ms + 'ms' : '失败',
    nat: natLabel(local.ip, clean(data.query)),
    quic: http.indexOf('h3') >= 0 || http.indexOf('http/3') >= 0 ? '✓/✓' : quicProbe.ok ? '×/×' : '失败',
    protocol: protocol || '未暴露',
    purity: scored.score,
    risk: scored.risk,
    media,
    ai,
    updatedAt: Date.now(),
  }
}

function tone(value: string) {
  if (value === '失败' || value === '高风险' || value === '×/×') return 'systemRed'
  if (value === '中风险' || value === 'CGNAT') return 'systemOrange'
  return 'systemGreen'
}

function Card({ children }: { children: any }) {
  return (
    <VStack alignment="leading" spacing={3} padding={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'leading' }} background={{ light: '#F7F9FC', dark: '#152033' }} clipShape={{ type: 'rect', cornerRadius: 14 }}>
      {children}
    </VStack>
  )
}

function Title({ symbol, text, tint }: { symbol: string; text: string; tint: string }) {
  return (
    <HStack spacing={4}>
      <Image systemName={symbol} resizable scaleToFit frame={{ width: 12, height: 12 }} foregroundStyle={tint} />
      <Text font="caption2" fontWeight="bold">{text}</Text>
    </HStack>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <VStack alignment="center" spacing={0} frame={{ maxWidth: 'infinity' }}>
      <Text font="caption2" fontWeight="bold" foregroundStyle={tone(value)}>{value}</Text>
      <Text font="caption2" foregroundStyle="secondaryLabel">{label}</Text>
    </VStack>
  )
}

function ServiceItem({ item }: { item: any }) {
  return (
    <HStack spacing={3} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
      <Text font="caption2" fontWeight="bold" foregroundStyle={item.ok ? 'systemGreen' : 'systemRed'}>{item.ok ? '✓' : '×'}</Text>
      <VStack alignment="leading" spacing={0}>
        <Text font="caption2" fontWeight="semibold">{item.name}</Text>
        <Text font="caption2" foregroundStyle="secondaryLabel">{item.ok ? (item.code || 'OK') : '失败'}</Text>
      </VStack>
    </HStack>
  )
}

function ServiceGrid({ items }: { items: any[] }) {
  const rows = []
  for (let index = 0; index < items.length; index += 2) {
    rows.push(
      <HStack spacing={4}>
        <ServiceItem item={items[index]} />
        {items[index + 1] ? <ServiceItem item={items[index + 1]} /> : <Spacer />}
      </HStack>
    )
  }
  return <VStack spacing={3}>{rows}</VStack>
}

function View({ report, mask }: { report: any; mask: boolean }) {
  const family = String(Widget.family || '')
  const small = family === 'systemSmall' || family.indexOf('accessory') === 0
  const large = family === 'systemLarge'
  const time = new Date(report.updatedAt || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const ip = mask ? maskIP(report.exitIP) : (report.exitIP || '--')
  const localIP = mask ? maskIP(report.localIP) : (report.localIP || '--')
  const media = report.media || []
  const ai = report.ai || []
  const mediaOk = media.filter((item: any) => item.ok).length
  const aiOk = ai.filter((item: any) => item.ok).length
  if (small) {
    return (
      <VStack alignment="leading" spacing={2} padding={10} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <Text font="caption" fontWeight="bold">网络诊断雷达</Text>
        <Text font="caption" fontWeight="semibold">{flag(report.code)} {report.place}</Text>
        <Text font="caption2" foregroundStyle="secondaryLabel">{ip}</Text>
        <Text font="caption2" foregroundStyle={tone(report.risk)}>{report.purity}分 · {report.risk}</Text>
      </VStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={6} padding={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <HStack>
        <Image systemName="waveform.path.ecg" resizable scaleToFit frame={{ width: 16, height: 16 }} foregroundStyle="systemBlue" />
        <VStack alignment="leading" spacing={0}>
          <Text font="caption" fontWeight="bold">网络诊断雷达</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">当前网络 · 全面状态检测</Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={0}>
          <Text font="caption" fontWeight="bold">{time}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">{report.protocol || '未暴露'}</Text>
        </VStack>
      </HStack>
      <HStack spacing={6} frame={{ maxWidth: 'infinity' }}>
        <Card>
          <Title symbol="wifi" text="本地网络" tint="systemBlue" />
          <Text font="caption" fontWeight="semibold">{localIP}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">IPv4/6 {report.hasV4 ? '✓' : '×'}/{report.hasV6 ? '✓' : '×'} · {report.localMs}</Text>
        </Card>
        <Card>
          <HStack>
            <Title symbol="point.3.connected.trianglepath.dotted" text="当前代理" tint="systemPurple" />
            <Spacer />
            <Text font="title3" fontWeight="bold" foregroundStyle={tone(report.risk)}>{report.purity}</Text>
          </HStack>
          <Text font="caption" fontWeight="semibold">{flag(report.code)} {report.place}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">{ip}</Text>
          <Text font="caption2">{report.isp}</Text>
        </Card>
      </HStack>
      {large ? (
        <HStack spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
          <Card>
            <Title symbol="play.rectangle.fill" text={'流媒体 ' + mediaOk + '/6'} tint="systemBlue" />
            <ServiceGrid items={media} />
          </Card>
          <Card>
            <Title symbol="sparkles" text={'AI ' + aiOk + '/6'} tint="systemPurple" />
            <ServiceGrid items={ai} />
          </Card>
        </HStack>
      ) : (
        <Text font="caption2" foregroundStyle="secondaryLabel">流媒体 {mediaOk}/6 · AI {aiOk}/6 · 大号可看明细</Text>
      )}
      <HStack>
        <Metric label="延迟" value={report.proxyMs || '--'} />
        <Metric label="NAT" value={report.nat || '--'} />
        <Metric label="QUIC" value={report.quic || '--'} />
        <Metric label="类型" value={report.kind || '--'} />
        <Metric label="风险" value={report.risk || '--'} />
      </HStack>
    </VStack>
  )
}

async function main() {
  const settings = Storage.get<any>(SETTINGS_KEY, { shared: true }) || {}
  const cached = Storage.get<any>(CACHE_KEY, { shared: true })
  let report = cached
  try {
    report = await diagnose(clean(settings.protocol))
    Storage.set(CACHE_KEY, report, { shared: true })
  } catch {
    report = cached || {
      localIP: '--', hasV4: false, hasV6: false, localMs: '失败', exitIP: '未识别', place: '检测失败', code: '',
      isp: '未知组织', kind: '出口网络', proxyMs: '失败', nat: '未知', quic: '失败', protocol: '未暴露',
      purity: 0, risk: '高风险', media: [], ai: [], updatedAt: Date.now(),
    }
  }
  Widget.present(<View report={report} mask={settings.maskIP === true} />, {
    supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
    reloadPolicy: { policy: 'after', date: new Date(Date.now() + 15 * 60 * 1000) },
  })
  Script.exit()
}

main()
