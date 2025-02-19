import path from 'path'

import debug from 'debug'

import { ConfigObjectSymbol } from './searchConfigs.js'

const debugLog = debug('lint-staged:groupFilesByConfig')

export const groupFilesByConfig = async ({ configs, files }) => {
  debugLog('Grouping %d files by %d configurations', files.length, Object.keys(configs).length)

  const filesSet = new Set(files)
  const filesByConfig = {}

  /** Configs are sorted deepest first by `searchConfigs` */
  for (const filepath of Reflect.ownKeys(configs)) {
    const config = configs[filepath]

    /** When passed an explicit config object via the Node.js API, skip logic */
    if (filepath === ConfigObjectSymbol) {
      filesByConfig[filepath] = { config, files }
      break
    }

    const dir = path.normalize(path.dirname(filepath))

    /** Check if file is inside directory of the configuration file */
    const isInsideDir = (file) => {
      const relative = path.relative(dir, file)
      return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    }

    /** This config should match all files since it has a parent glob */
    const includeAllFiles = Object.keys(config).some((glob) => glob.startsWith('..'))

    const scopedFiles = new Set(includeAllFiles ? filesSet : undefined)

    /**
     * Without a parent glob, if file is inside the config file's directory,
     * assign it to that configuration.
     */
    if (!includeAllFiles) {
      filesSet.forEach((file) => {
        if (isInsideDir(file)) {
          scopedFiles.add(file)
        }
      })
    }

    /** Files should only match a single config */
    scopedFiles.forEach((file) => {
      filesSet.delete(file)
    })

    filesByConfig[filepath] = { config, files: Array.from(scopedFiles) }
  }

  return filesByConfig
}
