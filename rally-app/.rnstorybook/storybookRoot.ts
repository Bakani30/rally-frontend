type StorybookUiOptions = {
  enableWebsockets: false
  initialSelection: 'home-home--ready'
  onDeviceUI: true
  shouldPersistSelection: false
}

type StorybookView<Root> = {
  getStorybookUI(options: StorybookUiOptions): Root
}

export function registerStorybookRoot<Root>(
  view: StorybookView<Root>,
  registerRootComponent: (root: Root) => void,
): Root {
  const root = view.getStorybookUI({
    enableWebsockets: false,
    initialSelection: 'home-home--ready',
    onDeviceUI: true,
    shouldPersistSelection: false,
  })
  registerRootComponent(root)
  return root
}
