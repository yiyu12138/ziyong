import { Navigation, Script } from 'scripting'
import { Reader } from './reader'

async function run() {
  await Navigation.present({ element: <Reader url="" /> })
  Script.exit()
}

run()
