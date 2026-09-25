import {
  NavigationStack,
  List,
  Section,
  Text,
  TextField,
  Button,
  useState,
  Script,
  Navigation,
  Widget,
  fetch,
} from 'scripting'

const SETTINGS_KEY = 'network-radar.settings.v1'
const CACHE_KEY = 'network-radar.cache.v1'

function loadSettings() {
  const saved = Storage.get<any>(SETTINGS_KEY, { shared: true }) || {}
  return {
    maskIP: saved.maskIP === true,
    protocol: String(saved.protocol || ''),
  }
}

async function probe(url: string) {
  const started = Date.now()
  try {
    const response = await fetch(url, {
      timeout: 4,
      allowInsecureRequest: url.indexOf('http://') === 0,
      headers: { 'Cache-Control': 'no-cache' },
    })
    return {
      ok: response.status >= 200 && response.status < 500,
      status: response.status,
      text: (await response.text()) || '',
      ms: Math.max(1, Date.now() - started),
    }
  } catch (error) {
    return { ok: false, status: 0, text: '', ms: 0, error: String(error) }
  }
}

function readJSON(text: string) {
  try { return JSON.parse(text) } catch { return null }
}

async function check(protocol: string) {
  const exitProbe = await probe('http://ip-api.com/json/?lang=zh-CN&fields=status,query,country,countryCode,regionName,city,isp,org,as,proxy,hosting,mobile&_=' + Date.now())
  const data = readJSON(exitProbe.text) || {}
  const local = await probe('https://www.baidu.com/favicon.ico?_=' + Date.now())
  const remote = await probe('https://cp.cloudflare.com/generate_204?_=' + Date.now())
  const report = {
    exitIP: String(data.query || '未识别'),
    place: [data.countryCode || '', data.city || data.country || '未知地区'].filter(Boolean).join(' '),
    isp: String(data.isp || data.org || '未知组织'),
    kind: data.hosting ? '商业机房' : data.mobile ? '移动网络' : '出口网络',
    localMs: local.ok ? local.ms + 'ms' : '失败',
    proxyMs: remote.ok ? remote.ms + 'ms' : '失败',
    protocol: protocol || '未暴露',
    updatedAt: Date.now(),
    error: exitProbe.ok ? '' : '出口检测失败',
  }
  Storage.set(CACHE_KEY, report, { shared: true })
  Widget.reloadAll()
  return report
}

function Page() {
  const initial = loadSettings()
  const [maskIP, setMaskIP] = useState(initial.maskIP)
  const [protocol, setProtocol] = useState(initial.protocol)
  const [status, setStatus] = useState('页面已打开。点下面开始检测。')

  function save() {
    Storage.set(SETTINGS_KEY, { maskIP, protocol: protocol.trim() }, { shared: true })
    setStatus('已保存。IP ' + (maskIP ? '打码' : '不打码') + '，协议 ' + (protocol.trim() || '未暴露'))
  }

  async function runCheck() {
    setStatus('正在检测当前网络…')
    try {
      Storage.set(SETTINGS_KEY, { maskIP, protocol: protocol.trim() }, { shared: true })
      const report = await check(protocol.trim())
      const ip = maskIP && report.exitIP.indexOf('.') > 0
        ? report.exitIP.split('.').slice(0, 2).join('.') + '.*.*'
        : report.exitIP
      setStatus(report.place + ' · ' + ip + ' · ' + report.isp + ' · 延迟 ' + report.proxyMs)
    } catch (error) {
      setStatus('检测失败：' + String(error))
    }
  }

  return (
    <NavigationStack>
      <List navigationTitle="网络诊断雷达">
        <Section header={<Text>当前结果</Text>} footer={<Text>请求走系统当前网络。开着 Egern VPN 时，就是当前节点。Scripting 不能选策略组。</Text>}>
          <Text>{status}</Text>
          <Button title="开始检测并刷新小组件" systemImage="arrow.clockwise" action={runCheck} />
        </Section>
        <Section header={<Text>显示</Text>}>
          <Button title={maskIP ? 'IP 打码：开' : 'IP 打码：关'} action={() => setMaskIP(!maskIP)} />
          <TextField title="协议" value={protocol} onChanged={setProtocol} prompt="例如 VLESS，可留空" />
          <Button title="保存设置" action={save} />
        </Section>
      </List>
    </NavigationStack>
  )
}

Navigation.present(<Page />).then(() => Script.exit())
