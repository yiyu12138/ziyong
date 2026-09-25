import { Widget, VStack, HStack, Text, Spacer, Script, fetch } from 'scripting'

const SETTINGS_KEY = 'network-radar.settings.v1'
const CACHE_KEY = 'network-radar.cache.v1'

async function probe(url: string) {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      timeout: 3,
      allowInsecureRequest: url.indexOf('http://') === 0,
      headers: { 'Cache-Control': 'no-cache' },
    })
    return {
      ok: response.status >= 200 && response.status < 400,
      text: (await response.text()) || '',
      ms: Math.max(1, Date.now() - started),
    }
  } catch {
    return { ok: false, text: '', ms: 0 }
  }
}

function readJSON(text: string) {
  try { return JSON.parse(text) } catch { return null }
}

function maskIP(value: string) {
  const parts = String(value || '').split('.')
  if (parts.length !== 4) return value || '未识别'
  return parts[0] + '.' + parts[1] + '.*.*'
}

async function diagnose(protocol: string) {
  const exitProbe = await probe('http://ip-api.com/json/?lang=zh-CN&fields=status,query,country,countryCode,city,isp,org,proxy,hosting,mobile&_=' + Date.now())
  const data = readJSON(exitProbe.text) || {}
  const remote = await probe('https://www.gstatic.com/generate_204?_=' + Date.now())
  return {
    exitIP: String(data.query || '未识别'),
    place: [data.countryCode || 'NET', data.city || data.country || '未知地区'].join(' '),
    isp: String(data.isp || data.org || '未知组织'),
    kind: data.hosting ? '商业机房' : data.mobile ? '移动网络' : '出口网络',
    proxyMs: remote.ok ? remote.ms + 'ms' : '失败',
    protocol: protocol || '未暴露',
    updatedAt: Date.now(),
  }
}

function View({ report, mask }: { report: any; mask: boolean }) {
  const ip = mask ? maskIP(report.exitIP) : report.exitIP
  const time = new Date(report.updatedAt || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return (
    <VStack alignment="leading" spacing={4} padding={12} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <HStack>
        <Text font="caption" fontWeight="bold">网络诊断雷达</Text>
        <Spacer />
        <Text font="caption2" foregroundStyle="secondaryLabel">{time}</Text>
      </HStack>
      <Text font="headline" fontWeight="semibold">{report.place || '检测中'}</Text>
      <Text font="caption" foregroundStyle="secondaryLabel">{ip}</Text>
      <Text font="caption2">{report.isp || '未知组织'} · {report.kind || '出口网络'}</Text>
      <HStack>
        <Text font="caption2" fontWeight="bold">{report.proxyMs || '--'}</Text>
        <Spacer />
        <Text font="caption2" foregroundStyle="secondaryLabel">{report.protocol || '未暴露'}</Text>
      </HStack>
    </VStack>
  )
}

async function main() {
  const settings = Storage.get<any>(SETTINGS_KEY, { shared: true }) || {}
  const cached = Storage.get<any>(CACHE_KEY, { shared: true })
  let report = cached
  try {
    report = await diagnose(String(settings.protocol || ''))
    Storage.set(CACHE_KEY, report, { shared: true })
  } catch {
    report = cached || {
      exitIP: '未识别',
      place: '检测失败',
      isp: '请先打开脚本运行一次',
      kind: '系统网络',
      proxyMs: '失败',
      protocol: String(settings.protocol || '未暴露'),
      updatedAt: Date.now(),
    }
  }
  Widget.present(<View report={report} mask={settings.maskIP === true} />, {
    supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
    reloadPolicy: { policy: 'after', date: new Date(Date.now() + 15 * 60 * 1000) },
  })
  Script.exit()
}

main()
