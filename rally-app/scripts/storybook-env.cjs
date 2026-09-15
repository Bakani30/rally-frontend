function isStorybookEnabled(env = process.env) {
  return env.STORYBOOK_ENABLED === 'true'
}

function isLocalStorybookRuntime(env = process.env) {
  return env.STORYBOOK_SERVER === 'false'
    && !env.STORYBOOK_WS_HOST
    && !env.STORYBOOK_WS_PORT
    && !env.STORYBOOK_WS_SECURED
}

module.exports = { isLocalStorybookRuntime, isStorybookEnabled }
