import { AppIntentManager, AppIntentProtocol, Widget } from 'scripting'

export const RefreshDingyueIntent = AppIntentManager.register({
  name: 'RefreshDingyueIntent',
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    Widget.reloadAll()
  },
})
