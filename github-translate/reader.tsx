import {
  NavigationStack,
  ScrollView,
  VStack,
  HStack,
  Text,
  Button,
  ProgressView,
  Markdown,
  useState,
  useEffect,
  useMemo,
  Clipboard,
  fetch,
} from 'scripting'

type Repo = { owner: string; repo: string; branch: string }

function parseGitHub(input: string): Repo | null {
  const value = String(input || '').trim()
  const match = value.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i)
  if (!match) return null
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ''),
    branch: '',
  }
}

async function readText(url: string) {
  const response = await fetch(url, { timeout: 15, headers: { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'Scripting' } })
  if (response.status < 200 || response.status >= 300) throw new Error('HTTP ' + response.status)
  return (await response.text()) || ''
}

async function resolve(input: string) {
  const direct = parseGitHub(input)
  let owner = direct?.owner || ''
  let repo = direct?.repo || ''
  if (!owner || !repo) {
    const query = String(input || '').trim().replace(/^https?:\/\/github\.com\//i, '').split(/[/?#]/)[0]
    if (!query) throw new Error('请分享 GitHub 仓库页面。')
    const found = JSON.parse(await readText('https://api.github.com/search/repositories?q=' + encodeURIComponent(query + ' in:name') + '&per_page=1'))
    const item = found.items?.[0]
    if (!item?.full_name) throw new Error('没有找到这个 GitHub 仓库。')
    const parts = String(item.full_name).split('/')
    owner = parts[0]
    repo = parts[1]
  }
  const info = JSON.parse(await readText(`https://api.github.com/repos/${owner}/${repo}`))
  const branch = String(info.default_branch || 'main')
  const markdown = await readText(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`)
  if (!markdown.trim()) throw new Error('这个仓库没有 README.md。')
  return { title: `${owner}/${repo}`, file: 'README.md', markdown }
}

function chunks(text: string) {
  const parts: string[] = []
  let rest = text
  while (rest.length > 1600) {
    let cut = rest.lastIndexOf('\n\n', 1600)
    if (cut < 800) cut = rest.lastIndexOf('\n', 1600)
    if (cut < 800) cut = 1600
    parts.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest) parts.push(rest)
  return parts
}

export function Reader({ url }: { url: string }) {
  const translation = useMemo(() => new Translation(), [])
  const [status, setStatus] = useState(url ? '正在读取 Markdown…' : '先从 GitHub 分享一个仓库或 .md 文件。')
  const [title, setTitle] = useState('GitHub 翻译')
  const [file, setFile] = useState('')
  const [original, setOriginal] = useState('')
  const [translated, setTranslated] = useState('')
  const [busy, setBusy] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  async function open(input: string) {
    setBusy(true)
    setTranslated('')
    setOriginal('')
    setStatus('正在读取 README.md…')
    try {
      const source = await resolve(input)
      setTitle(source.title)
      setFile(source.file)
      setOriginal(source.markdown)
      const pieces = chunks(source.markdown)
      const result: string[] = []
      for (let index = 0; index < pieces.length; index += 1) {
        setStatus(`正在翻译 ${index + 1}/${pieces.length}`)
        const value = await translation.translate({ text: pieces[index], source: 'en', target: 'zh' })
        result.push(String(value || pieces[index]))
        setTranslated(result.join(''))
      }
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (url) open(url)
  }, [])

  return (
    <NavigationStack>
      <ScrollView navigationTitle={title}>
        <VStack alignment="leading" spacing={12} padding={16} translationHost={translation}>
          <Text font="caption" foregroundStyle="secondaryLabel">{file || '分享 GitHub 仓库或 Markdown 链接'}</Text>
          {busy ? <ProgressView /> : null}
          {status ? <Text>{status}</Text> : null}
          {translated ? <Markdown content={showOriginal ? original : translated} /> : null}
          {translated ? (
            <HStack>
              <Button title={showOriginal ? '看译文' : '看原文'} action={() => setShowOriginal(!showOriginal)} />
              <Button title="复制译文" action={() => Clipboard.copyText(translated)} />
            </HStack>
          ) : null}
        </VStack>
      </ScrollView>
    </NavigationStack>
  )
}
