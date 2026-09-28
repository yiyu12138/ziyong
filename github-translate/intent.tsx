import { Intent, Navigation, Script } from 'scripting'
import { Reader } from './reader'

function firstURL() {
  const values: string[] = []
  for (const value of Intent.urlsParameter || []) values.push(String(value || '').trim())
  for (const value of Intent.textsParameter || []) values.push(String(value || '').trim())
  const shortcut = Intent.shortcutParameter
  if (shortcut?.type === 'text' || shortcut?.type === 'fileURL') values.push(String(shortcut.value || '').trim())
  return values.find((value) => /github\.com\//i.test(value)) || values.find((value) => /^https?:\/\//i.test(value)) || ''
}

async function run() {
  const url = firstURL()
  if (!url) {
    await Dialog.alert({ title: '没有链接', message: '请从 GitHub 点分享，选择 Scripting。' })
    Script.exit()
    return
  }
  await Navigation.present({ element: <Reader url={url} /> })
  Script.exit()
}

run()
