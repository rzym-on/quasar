import { normalizePath } from 'vite'

import { getViteConfig } from './vite-config'
import { vueTransform } from './vue-transform'
import { createScssTransform } from './scss-transform'
import { parseViteRequest } from './query'
import { mapQuasarImports } from './js-transform'

const defaultOptions = {
  runMode: 'web-client',
  autoImportComponentCase: 'kebab',
  sassVariables: true,
  devTreeshaking: false
}

function getConfigPlugin (opts) {
  return {
    name: 'vite:quasar:vite-conf',

    config (viteConf) {
      const vueCfg = viteConf.plugins.find(entry => entry.name === 'vite:vue')

      if (vueCfg === void 0) {
        console.warn('In your Vite config file, please add the Quasar plugin after the Vue one')
        process.exit(1)
      }

      return getViteConfig(opts.runMode, viteConf)
    }
  }
}

function getScssTransformsPlugin (opts) {
  const sassVariables = typeof opts.sassVariables === 'string'
    ? normalizePath(opts.sassVariables)
    : opts.sassVariables

  const scssTransform = createScssTransform('scss', sassVariables)
  const sassTransform = createScssTransform('sass', sassVariables)
  const scssExt = [ '.scss' ]
  const sassExt = [ '.sass' ]

  return {
    name: 'vite:quasar:scss',

    enforce: 'pre',

    transform (src, id) {
      const { is } = parseViteRequest(id)

      if (is.style(scssExt) === true) {
        return {
          code: scssTransform(src),
          map: null
        }
      }

      if (is.style(sassExt) === true) {
        return {
          code: sassTransform(src),
          map: null
        }
      }

      return null
    }
  }
}

function getScriptTransformsPlugin (opts) {
  let useTreeshaking = true

  return {
    name: 'vite:quasar:script',

    configResolved (resolvedConfig) {
      if (opts.devTreeshaking === false && resolvedConfig.mode === 'development') {
        useTreeshaking = false
      }
    },

    transform (src, id) {
      const { is } = parseViteRequest(id)

      if (is.template() === true) {
        return {
          code: vueTransform(src, opts.autoImportComponentCase, useTreeshaking),
          map: null // provide source map if available
        }
      }

      if (useTreeshaking === true && is.script() === true) {
        return {
          code: mapQuasarImports(src),
          map: null // provide source map if available
        }
      }

      return null
    }
  }
}

export default function (userOpts = {}) {
  const opts = {
    ...defaultOptions,
    ...userOpts
  }

  const plugins = [
    getConfigPlugin(opts)
  ]

  if (opts.sassVariables) {
    plugins.push(
      getScssTransformsPlugin(opts)
    )
  }

  if (opts.runMode !== 'ssr-server') {
    plugins.push(
      getScriptTransformsPlugin(opts)
    )
  }

  return plugins
}
