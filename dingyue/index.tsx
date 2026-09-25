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

const SETTINGS_KEY = 'dingyue.settings.v1'

function loadSettings() {
  const saved = Storage.get<any>(SETTINGS_KEY, { shared: true }) || {}
  return {
    url: String(saved.url || ''),
    name: String(saved.name || ''),
    refreshHours: String(saved.refreshHours || '2'),
    userAgent: String(saved.userAgent || 'clash.meta'),
    planTotalGB: String(saved.planTotalGB || '100'),
  }
}

function Page() {
  const initial = loadSettings()
  const [url, setUrl] = useState(initial.url)
  const [name, setName] = useState(initial.name)
  const [refreshHours, setRefreshHours] = useState(initial.refreshHours)
  const [userAgent, setUserAgent] = useState(initial.userAgent)
  const [planTotalGB, setPlanTotalGB] = useState(initial.planTotalGB)
  const [status, setStatus] = useState('地址只保存在这台手机，不会写进仓库。')

  function save() {
    Storage.set(SETTINGS_KEY, {
      url: url.trim(),
      name: name.trim() || '订阅',
      refreshHours: refreshHours.trim() || '2',
      userAgent: userAgent.trim() || 'clash.meta',
      planTotalGB: planTotalGB.trim() || '100',
    }, { shared: true })
    Widget.reloadAll()
    setStatus(url.trim() ? '已保存。回到桌面等小组件刷新，或删掉重加一次。' : '还没填订阅地址，小组件会显示待配置。')
  }

  async function test() {
    const target = url.trim()
    if (!target) {
      setStatus('先填订阅地址，再点测试。')
      return
    }
    setStatus('正在读订阅，稍等。')
    try {
      const response = await fetch(target, {
        timeout: 8,
        headers: { 'User-Agent': userAgent.trim() || 'clash.meta', Accept: '*/*' },
      })
      const info = response.headers?.get?.('subscription-userinfo') || ''
      setStatus(info ? '能读到流量：' + info : '网页打开了，但没看到流量头。小组件还会再从正文里找。')
      save()
    } catch (error) {
      setStatus('读失败：' + String(error))
    }
  }

  return (
    <NavigationStack>
      <List navigationTitle="订阅流量">
        <Section footer={<Text>必填。把机场给的订阅链接整段贴进来，一般以 https:// 开头，后面带 token。</Text>}>
          <Text fontWeight="semibold">订阅地址</Text>
          <TextField title="订阅地址" prompt="https://example.com/subscribe?token=..." value={url} onChanged={setUrl} />
        </Section>
        <Section footer={<Text>选填。小组件上显示的名字，比如「我的机场」。不填就显示「订阅」。</Text>}>
          <Text fontWeight="semibold">显示名称</Text>
          <TextField title="显示名称" prompt="例如 我的机场" value={name} onChanged={setName} />
        </Section>
        <Section footer={<Text>选填。小组件隔多久再查一次，单位是小时。默认 2，也就是两小时查一次。</Text>}>
          <Text fontWeight="semibold">刷新间隔</Text>
          <TextField title="刷新间隔（小时）" prompt="2" value={refreshHours} onChanged={setRefreshHours} />
        </Section>
        <Section footer={<Text>选填。有些机场只认特定客户端。不知道就留 clash.meta，不要改。</Text>}>
          <Text fontWeight="semibold">客户端标识</Text>
          <TextField title="User-Agent" prompt="clash.meta" value={userAgent} onChanged={setUserAgent} />
        </Section>
        <Section footer={<Text>选填。订阅已经写了总流量就不用管。只有它只给剩余流量时，用这里的 GB 估算套餐总量，默认 100。</Text>}>
          <Text fontWeight="semibold">套餐总量</Text>
          <TextField title="套餐总量（GB）" prompt="100" value={planTotalGB} onChanged={setPlanTotalGB} />
        </Section>
        <Section footer={<Text>{status}</Text>}>
          <Button title="保存并刷新小组件" systemImage="arrow.clockwise" action={save} />
          <Button title="测试订阅地址" systemImage="network" action={test} />
        </Section>
      </List>
    </NavigationStack>
  )
}

Navigation.present(<Page />).then(() => Script.exit())
