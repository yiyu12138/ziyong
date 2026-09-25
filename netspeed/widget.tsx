import { Widget, VStack, HStack, Text, Spacer, Image, Script, fetch, Button, modifiers } from 'scripting'
import { RefreshNetSpeedIntent } from './app_intents'

const CACHE_KEY = 'netspeed.cache.v1'
const TEST_URL = 'https://speed.cloudflare.com/__down?bytes=3145728'

async function measure() {
  const started = Date.now()
  const response = await fetch(TEST_URL, {
    timeout: 12,
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (response.status < 200 || response.status >= 400) throw new Error('HTTP ' + response.status)
  const data = await response.data()
  const bytes = Number(data?.byteLength || data?.length || 3145728)
  const duration = Math.max(0.05, (Date.now() - started) / 1000)
  const mBs = bytes / 1024 / 1024 / duration
  return {
    mbps: Number((mBs * 8).toFixed(1)),
    mBs: Number(mBs.toFixed(2)),
    duration: duration.toFixed(2),
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

function View({ speed }: { speed: any }) {
  const family = String(Widget.family || '')
  const small = family === 'systemSmall'
  const look = tone(Number(speed.mbps) || 0)
  const time = new Date(speed.timestamp || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const width = Math.max(72, Math.round((Widget.displaySize?.width || 160) - 36))
  const fill = Math.max(10, Math.round(width * Math.min(1, (Number(speed.mbps) || 0) / 100)))
  return (
    <Button
      intent={RefreshNetSpeedIntent(undefined)}
      buttonStyle="plain"
      modifiers={modifiers().frame({ maxWidth: 'infinity', maxHeight: 'infinity' })}
    >
      <VStack alignment="center" spacing={small ? 6 : 8} padding={small ? 12 : 16} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <HStack>
          <Image systemName={look.icon} resizable scaleToFit frame={{ width: 14, height: 14 }} foregroundStyle={look.color} />
          <Text font="caption2" fontWeight="semibold" foregroundStyle={look.color}>网速</Text>
          <Spacer />
          <Text font="caption2" foregroundStyle="secondaryLabel">{speed.stale ? '上次 ' : ''}{time}</Text>
        </HStack>
        <Spacer />
        <Text font={small ? 'title' : 'largeTitle'} fontWeight="bold" foregroundStyle={look.color}>{speed.mbps || 0} Mbps</Text>
        <HStack spacing={0} frame={{ width, height: 4 }} background={{ light: '#E8E8ED', dark: '#202025' }} clipShape={{ type: 'rect', cornerRadius: 2 }}>
          <HStack frame={{ width: fill, height: 4 }} background={look.color} />
        </HStack>
        <HStack frame={{ width }}>
          <Text font="caption2" foregroundStyle="secondaryLabel">{speed.mBs || 0} MB/s</Text>
          <Spacer />
          <Text font="caption2" foregroundStyle="secondaryLabel">{speed.duration || 0}s</Text>
        </HStack>
        <Spacer />
      </VStack>
    </Button>
  )
}

async function main() {
  const cached = Storage.get<any>(CACHE_KEY, { shared: true })
  let speed = cached ? { ...cached, stale: true } : { mbps: 0, mBs: 0, duration: 0, timestamp: Date.now(), stale: false }
  try {
    speed = await measure()
    Storage.set(CACHE_KEY, speed, { shared: true })
  } catch {
    speed = cached ? { ...cached, stale: true } : speed
  }
  Widget.present(<View speed={speed} />, {
    supportedFamilies: ['systemSmall', 'systemMedium'],
    reloadPolicy: { policy: 'after', date: new Date(Date.now() + 30 * 60 * 1000) },
  })
  Script.exit()
}

main()
