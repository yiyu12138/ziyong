import { Widget, VStack, HStack, Text, Spacer, Image, Script, fetch } from 'scripting'

const SETTINGS_KEY = 'dingyue.settings.v1'
const CACHE_KEY = 'dingyue.cache.v1'

function clean(value: any) {
  return String(value == null ? '' : value).trim()
}

function hashString(value: string) {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  return (hash >>> 0).toString(36)
}

function headerValue(response: any, name: string) {
  try {
    const headers = response?.headers
    if (headers && typeof headers.get === 'function') return headers.get(name) || headers.get(name.toLowerCase()) || ''
    const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === name.toLowerCase())
    return key ? headers[key] : ''
  } catch {
    return ''
  }
}

function parseUserInfo(raw: string) {
  const values: any = {}
  clean(raw).split(';').forEach((part) => {
    const index = part.indexOf('=')
    if (index < 1) return
    const key = part.slice(0, index).trim().toLowerCase()
    const value = Number(part.slice(index + 1).trim())
    if (Number.isFinite(value)) values[key] = value
  })
  if (!Number.isFinite(values.upload) || !Number.isFinite(values.download) || !Number.isFinite(values.total)) return null
  const upload = Math.max(0, values.upload)
  const download = Math.max(0, values.download)
  const total = Math.max(0, values.total)
  const used = upload + download
  const expireValue = Number(values.expire) || 0
  return {
    upload, download, total, used,
    remaining: total === 0 ? Infinity : Math.max(0, total - used),
    unlimited: total === 0,
    expireAt: expireValue > 1000000000000 ? expireValue : expireValue * 1000,
    partial: false,
  }
}

function unitBytes(value: string, unit: string) {
  const powers: any = { B: 0, KB: 1, MB: 2, GB: 3, TB: 4, PB: 5 }
  const power = powers[clean(unit).toUpperCase()]
  if (power == null) return null
  return Number(value) * (1024 ** power)
}

function parseBodyInfo(body: string) {
  const source = String(body || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
  const expireMatch = source.match(/(?:有效期|到期(?:时间)?|过期(?:时间)?)[：:\s]*([12]\d{3}[-/.]\d{1,2}[-/.]\d{1,2})/i)
  const remainingMatch = source.match(/剩余(?:流量)?[：:\s]*([0-9]+(?:\.[0-9]+)?)\s*(PB|TB|GB|MB|KB|B)/i)
  if (!remainingMatch) return null
  const remaining = unitBytes(remainingMatch[1], remainingMatch[2])
  if (!Number.isFinite(remaining)) return null
  const totalMatch = source.match(/(?:总(?:流量|量)|套餐流量)[：:\s]*([0-9]+(?:\.[0-9]+)?)\s*(PB|TB|GB|MB|KB|B)/i)
  const usedMatch = source.match(/已用(?:流量)?[：:\s]*([0-9]+(?:\.[0-9]+)?)\s*(PB|TB|GB|MB|KB|B)/i)
  const total = totalMatch ? unitBytes(totalMatch[1], totalMatch[2]) : null
  const explicitUsed = usedMatch ? unitBytes(usedMatch[1], usedMatch[2]) : null
  let expireAt = 0
  if (expireMatch) {
    const parsed = new Date(expireMatch[1].replace(/[/.]/g, '-') + 'T23:59:59')
    if (!Number.isNaN(parsed.getTime())) expireAt = parsed.getTime()
  }
  return {
    upload: null,
    download: null,
    total,
    used: Number.isFinite(explicitUsed) ? explicitUsed : Number.isFinite(total) ? Math.max(0, Number(total) - Number(remaining)) : null,
    remaining,
    unlimited: false,
    expireAt,
    partial: !Number.isFinite(total),
  }
}

function applyPlan(traffic: any, planTotalGB: string) {
  const planGB = Number(planTotalGB || 100)
  if (!traffic || Number.isFinite(traffic.total) || !Number.isFinite(planGB) || planGB <= 0) return traffic
  const total = planGB * (1024 ** 3)
  return { ...traffic, total, used: Math.max(0, total - traffic.remaining), partial: false, totalEstimated: true }
}

async function fetchSubscription(url: string, userAgent: string) {
  const agents = Array.from(new Set([userAgent, 'clash.meta', 'clash-verge/v2.2.3', 'Surge/5.0'].filter(Boolean)))
  let lastError = '订阅未返回可识别的流量信息'
  for (const agent of agents) {
    try {
      const response = await fetch(url, { timeout: 8, headers: { 'User-Agent': agent, Accept: '*/*' } })
      const header = parseUserInfo(headerValue(response, 'subscription-userinfo'))
      if (header) return header
      const body = parseBodyInfo(await response.text())
      if (body) return body
      lastError = 'HTTP ' + response.status + '，没有流量信息'
    } catch (error) {
      lastError = String(error)
    }
  }
  throw new Error(lastError)
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '不限量'
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / (1024 ** index)
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 1
  return value.toFixed(digits) + ' ' + units[index]
}

function formatDate(timestamp: number) {
  if (!timestamp) return '长期有效'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

function daysRemaining(expireAt: number) {
  if (!expireAt) return null
  return Math.ceil((expireAt - Date.now()) / 86400000)
}

function percentRemaining(traffic: any) {
  if (!traffic || traffic.unlimited || !Number.isFinite(traffic.total) || traffic.total <= 0) return null
  return Math.max(0, Math.min(100, (traffic.remaining / traffic.total) * 100))
}

function statusOf(data: any) {
  if (data.mode === 'setup') return { label: 'SETUP', color: 'secondaryLabel' }
  if (data.mode === 'error') return { label: 'ERROR', color: 'systemRed' }
  if (data.mode === 'stale') return { label: 'STALE', color: 'systemOrange' }
  const traffic = data.traffic || {}
  const days = daysRemaining(traffic.expireAt)
  const ratio = percentRemaining(traffic)
  if ((!traffic.unlimited && traffic.remaining <= 0) || (days != null && days <= 0)) return { label: 'EXPIRED', color: 'systemRed' }
  if ((ratio != null && ratio <= 20) || (days != null && days <= 7)) return { label: 'LOW', color: 'systemOrange' }
  return { label: 'ACTIVE', color: 'systemGreen' }
}

function Bar({ percent }: { percent: number | null }) {
  const width = Math.max(96, Math.round((Widget.displaySize?.width || 160) - 36))
  const fill = percent == null ? 8 : Math.max(6, Math.round(width * percent / 100))
  return (
    <HStack spacing={0} frame={{ width, height: 6 }} background={{ light: '#E8E8ED', dark: '#202025' }} clipShape={{ type: 'rect', cornerRadius: 3 }}>
      <HStack frame={{ width: fill, height: 6 }} background="#7446D8" />
    </HStack>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <VStack alignment="leading" spacing={1} frame={{ maxWidth: 'infinity' }}>
      <Text font="caption2" foregroundStyle="secondaryLabel">{label}</Text>
      <Text font="caption" fontWeight="semibold">{value}</Text>
    </VStack>
  )
}

function View({ data }: { data: any }) {
  const family = String(Widget.family || '')
  const small = family === 'systemSmall'
  const large = family === 'systemLarge'
  const status = statusOf(data)
  const traffic = data.traffic
  const percent = traffic ? percentRemaining(traffic) : null
  const days = traffic ? daysRemaining(traffic.expireAt) : null
  const daily = days && days > 0 && traffic && Number.isFinite(traffic.remaining) ? traffic.remaining / days : null
  return (
    <VStack alignment="leading" spacing={6} padding={small ? 12 : 14} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background={{ light: '#FFFFFF', dark: '#050506' }}>
      <HStack>
        <Image systemName="chart.pie.fill" resizable scaleToFit frame={{ width: 14, height: 14 }} foregroundStyle="#7446D8" />
        <Text font="caption2" fontWeight="bold" foregroundStyle="secondaryLabel">SUBSCRIPTION</Text>
        <Spacer />
        <Text font="caption2" fontWeight="bold" foregroundStyle={status.color}>{status.label}</Text>
      </HStack>
      {traffic ? (
        <VStack alignment="leading" spacing={4} frame={{ maxWidth: 'infinity' }}>
          <Text font={small ? 'title2' : 'title'} fontWeight="bold">{formatBytes(traffic.remaining)}</Text>
          <HStack>
            <Text font="caption2" foregroundStyle="secondaryLabel">剩余流量</Text>
            <Spacer />
            <Text font="caption" fontWeight="semibold">{traffic.unlimited ? '∞' : percent == null ? '--' : percent.toFixed(0) + '%'}</Text>
          </HStack>
          {percent == null && !traffic.unlimited ? <Text font="caption2" foregroundStyle="secondaryLabel">服务商只给了剩余流量</Text> : <Bar percent={percent} />}
          {small ? null : (
            <HStack>
              <Text font="caption2" foregroundStyle="secondaryLabel">已用 {formatBytes(traffic.used)}</Text>
              <Spacer />
              <Text font="caption2" foregroundStyle="secondaryLabel">{days == null ? '长期' : Math.max(0, days) + ' 天'}</Text>
            </HStack>
          )}
          {large ? (
            <VStack alignment="leading" spacing={6} frame={{ maxWidth: 'infinity' }}>
              <HStack>
                <Metric label="下载" value={formatBytes(traffic.download)} />
                <Metric label="上传" value={formatBytes(traffic.upload)} />
                <Metric label="合计已用" value={formatBytes(traffic.used)} />
              </HStack>
              <HStack>
                <Metric label="套餐总量" value={traffic.unlimited ? '不限量' : formatBytes(traffic.total)} />
                <Metric label="剩余天数" value={days == null ? '长期' : Math.max(0, days) + ' 天'} />
                <Metric label="日均可用" value={daily == null ? '--' : formatBytes(daily)} />
              </HStack>
            </VStack>
          ) : null}
          <HStack>
            <Text font="caption2" foregroundStyle="secondaryLabel">{data.name || '订阅'}</Text>
            <Spacer />
            <Text font="caption2" foregroundStyle="secondaryLabel">{formatDate(traffic.expireAt)}</Text>
          </HStack>
          {data.mode === 'stale' ? <Text font="caption2" foregroundStyle="systemOrange">显示上次结果</Text> : null}
        </VStack>
      ) : (
        <VStack alignment="center" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
          <Spacer />
          <Image systemName={data.mode === 'setup' ? 'link.badge.plus' : 'exclamationmark.triangle'} resizable scaleToFit frame={{ width: 22, height: 22 }} foregroundStyle={data.mode === 'setup' ? 'secondaryLabel' : 'systemRed'} />
          <Text font="caption" fontWeight="semibold">{data.mode === 'setup' ? '等待订阅地址' : '无法读取流量'}</Text>
          <Text font="caption2" foregroundStyle="secondaryLabel">{data.mode === 'setup' ? '打开脚本填写地址' : (data.error || '加载失败')}</Text>
          <Spacer />
        </VStack>
      )}
    </VStack>
  )
}

async function main() {
  const settings = Storage.get<any>(SETTINGS_KEY, { shared: true }) || {}
  const url = clean(settings.url)
  const name = clean(settings.name) || '订阅'
  const cacheKey = CACHE_KEY + '.' + hashString(url || 'empty')
  const cached = Storage.get<any>(cacheKey, { shared: true })
  let data: any = { mode: 'setup', name }
  if (url) {
    try {
      const traffic = applyPlan(await fetchSubscription(url, clean(settings.userAgent) || 'clash.meta'), settings.planTotalGB)
      data = { mode: 'live', name, traffic, updatedAt: Date.now() }
      Storage.set(cacheKey, data, { shared: true })
    } catch (error) {
      data = cached?.traffic
        ? { ...cached, name, mode: 'stale', error: String(error) }
        : { mode: 'error', name, error: String(error) }
    }
  }
  const hours = Math.min(24, Math.max(0.5, Number(settings.refreshHours) || 2))
  Widget.present(<View data={data} />, {
    supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
    reloadPolicy: { policy: 'after', date: new Date(Date.now() + hours * 3600000) },
  })
  Script.exit()
}

main()
