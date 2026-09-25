import {
  NavigationStack,
  Form,
  Section,
  Text,
  Button,
  useState,
  Script,
  Navigation,
  Widget,
  fetch,
} from 'scripting'

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
  }
}

function Page() {
  const [status, setStatus] = useState('桌面点小组件也会重新测一次。每次大约下载 3MB。')

  async function run() {
    setStatus('正在测速，别切走。')
    try {
      const result = await measure()
      Storage.set(CACHE_KEY, result, { shared: true })
      Widget.reloadAll()
      setStatus(result.mbps + ' Mbps · ' + result.mBs + ' MB/s · ' + result.duration + ' 秒')
    } catch (error) {
      setStatus('测速失败：' + String(error))
    }
  }

  return (
    <NavigationStack>
      <Form navigationTitle="网速">
        <Section header={<Text>说明</Text>} footer={<Text>{status}</Text>}>
          <Text>从 Cloudflare 下载 3MB，估算当前下载速度。背景是透明的，点桌面小组件会再测一次。</Text>
          <Button title="立即测速并刷新小组件" systemImage="speedometer" action={run} />
          <Button title="预览中号小组件" action={() => Widget.preview({ family: 'systemMedium' })} />
        </Section>
      </Form>
    </NavigationStack>
  )
}

Navigation.present(<Page />).then(() => Script.exit())
