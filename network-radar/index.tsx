import {
  NavigationStack,
  List,
  Section,
  Text,
  TextField,
  Toggle,
  Button,
  useState,
  Script,
  Widget,
  Storage,
  Navigation,
} from 'scripting'

const SETTINGS_KEY = 'network-radar.settings.v1'

function Page() {
  const initial = Storage.get<{ maskIP?: boolean; protocol?: string }>(SETTINGS_KEY, { shared: true }) || {}
  const [maskIP, setMaskIP] = useState(initial.maskIP === true)
  const [protocol, setProtocol] = useState(String(initial.protocol || ''))
  const [message, setMessage] = useState('')

  function save() {
    Storage.set(SETTINGS_KEY, { maskIP, protocol: protocol.trim() }, { shared: true })
    Widget.reloadAll()
    setMessage('已保存，小组件会按系统网络重新检测')
  }

  return (
    <NavigationStack>
      <List navigationTitle="网络诊断雷达">
        <Section header={<Text>显示</Text>}>
          <Toggle title="IP 打码" value={maskIP} onChanged={setMaskIP} />
          <TextField title="协议" value={protocol} onChanged={setProtocol} prompt="例如 VLESS，留空显示未暴露" />
        </Section>
        <Section header={<Text>说明</Text>} footer={<Text>Scripting 不能选择 Egern 策略组。检测请求走系统当前网络；开了 Egern VPN 时，就是当前节点。</Text>}>
          <Button title="保存并刷新小组件" action={save} />
          <Button title="预览中号小组件" action={() => Widget.preview({ family: 'systemMedium' })} />
          <Button title="预览大号小组件" action={() => Widget.preview({ family: 'systemLarge' })} />
        </Section>
        {message ? <Section><Text foregroundStyle="secondaryLabel">{message}</Text></Section> : null}
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present({ element: <Page /> })
  Script.exit()
}

run()
