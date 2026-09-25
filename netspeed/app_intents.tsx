import { AppIntentManager, AppIntentProtocol, Widget } from 'scripting'

export const RefreshNetSpeedIntent = AppIntentManager.register({
  name: 'RefreshNetSpeedIntent',
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    Widget.reloadAll()
  },
})
