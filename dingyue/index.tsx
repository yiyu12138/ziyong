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
    name: String(saved.name || '订阅'),
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
  const [status, setStatus] = useState('填写订阅地址后保存。地址只留在这台手机。')

  function save() {
    Storage.set(SETTINGS_KEY, {
      url: url.trim(),
      name: name.trim() || '订阅',
      refreshHours: refreshHours.trim() || '2',
      userAgent: userAgent.trim() || 'clash.meta',
      planTotalGB: planTotalGB.trim() || '100',
    }, { shared: true })
    Widget.reloadAll()
    setStatus('已保存，小组件会重新读取流量')
  }

  async function test() {
    const target = url.trim()
    if (!target) {
      setStatus('还没有订阅地址')
      return
    }
    setStatus('正在读取订阅…')
    try {
      const response = await fetch(target, {
        timeout: 8,
        headers: { 'User-Agent': userAgent.trim() || 'clash.meta', Accept: '*/*' },
      })
      const info = response.headers?.get?.('subscription-userinfo') || ''
      setStatus(info ? '读到流量头：' + info : '请求成功，但响应头里没有 subscription-userinfo，小组件会再尝试从正文识别')
      save()
    } catch (error) {
      setStatus('读取失败：' + String(error))
    }
  }

  return (
    <NavigationStack>
      <List navigationTitle="订阅流量">
        <Section header={<Text>订阅</Text>} footer={<Text>{status}</Text>}>
          <TextField title="地址" value={url} onChanged={setUrl} prompt="https://..." />
          <TextField title="名称" value={name} onChanged={setName} prompt="我的订阅" />
          <TextField title="刷新小时" value={refreshHours} onChanged={setRefreshHours} prompt="2" />
          <TextField title="User-Agent" value={userAgent} onChanged={setUserAgent} prompt="clash.meta" />
          <TextField title="套餐 GB" value={planTotalGB} onChanged={setPlanTotalGB} prompt="正文只有剩余流量时用来估算总量" />
          <Button title="保存并刷新小组件" systemImage="arrow.clockwise" action={save} />
          <Button title="测试订阅地址" systemImage="network" action={test} />
        </Section>
      </List>
    </NavigationStack>
  )
}

Navigation.present(<Page />).then(() => Script.exit())
