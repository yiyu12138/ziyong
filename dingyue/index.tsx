import {
  NavigationStack,
  Form,
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
    refreshHours: String(saved.refreshHours || ''),
    userAgent: String(saved.userAgent || ''),
    planTotalGB: String(saved.planTotalGB || ''),
  }
}

function Page() {
  const initial = loadSettings()
  const [url, setUrl] = useState(initial.url)
  const [name, setName] = useState(initial.name)
  const [refreshHours, setRefreshHours] = useState(initial.refreshHours)
  const [userAgent, setUserAgent] = useState(initial.userAgent)
  const [planTotalGB, setPlanTotalGB] = useState(initial.planTotalGB)
  const [status, setStatus] = useState('看到标题「订阅流量 1.2」才是新页面。')

  function save() {
    Storage.set(SETTINGS_KEY, {
      url: url.trim(),
      name: name.trim() || '订阅',
      refreshHours: refreshHours.trim() || '2',
      userAgent: userAgent.trim() || 'clash.meta',
      planTotalGB: planTotalGB.trim() || '100',
    }, { shared: true })
    Widget.reloadAll()
    setStatus(url.trim() ? '已保存。桌面小组件删掉重加一次。' : '订阅地址还是空的。')
  }

  async function test() {
    const target = url.trim()
    if (!target) {
      setStatus('先把订阅链接贴进第一框。')
      return
    }
    setStatus('正在读订阅。')
    try {
      const response = await fetch(target, {
        timeout: 8,
        headers: { 'User-Agent': userAgent.trim() || 'clash.meta', Accept: '*/*' },
      })
      const info = response.headers?.get?.('subscription-userinfo') || ''
      setStatus(info ? '读到流量：' + info : '打开了，但没有流量头。保存后小组件会再从正文找。')
      save()
    } catch (error) {
      setStatus('读失败：' + String(error))
    }
  }

  return (
    <NavigationStack>
      <Form navigationTitle="订阅流量 1.2">
        <Section header={<Text>1. 订阅地址，必填</Text>} footer={<Text>把机场给的整段订阅链接贴进来。一般以 https:// 开头，后面带 token。只存在这台手机。</Text>}>
          <TextField title="订阅地址" prompt="在这里粘贴 https:// 订阅链接" value={url} onChanged={setUrl} />
        </Section>
        <Section header={<Text>2. 显示名称，可不填</Text>} footer={<Text>小组件上显示的名字。不填就显示「订阅」。</Text>}>
          <TextField title="显示名称" prompt="例如：我的机场" value={name} onChanged={setName} />
        </Section>
        <Section header={<Text>3. 刷新间隔，可不填</Text>} footer={<Text>隔几小时查一次流量。不填默认 2 小时。</Text>}>
          <TextField title="刷新间隔" prompt="不填默认 2 小时" value={refreshHours} onChanged={setRefreshHours} />
        </Section>
        <Section header={<Text>4. 客户端标识，可不填</Text>} footer={<Text>有些机场只认特定客户端。不知道就留空，会自动用 clash.meta。</Text>}>
          <TextField title="客户端标识" prompt="不填默认 clash.meta" value={userAgent} onChanged={setUserAgent} />
        </Section>
        <Section header={<Text>5. 套餐总量，可不填</Text>} footer={<Text>单位是 GB。订阅已经写了总流量就留空。只有它只给剩余流量时，才用这里估算，默认 100GB。</Text>}>
          <TextField title="套餐总量" prompt="不填默认 100GB" value={planTotalGB} onChanged={setPlanTotalGB} />
        </Section>
        <Section header={<Text>保存</Text>} footer={<Text>{status}</Text>}>
          <Button title="保存并刷新小组件" systemImage="arrow.clockwise" action={save} />
          <Button title="测试订阅地址" systemImage="network" action={test} />
        </Section>
      </Form>
    </NavigationStack>
  )
}

Navigation.present(<Page />).then(() => Script.exit())
