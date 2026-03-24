import path from 'path'
import { Config } from '@remotion/cli/config'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'

Config.setPublicDir('assets')

Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      plugins: [
        ...(config.resolve?.plugins ?? []),
        new TsconfigPathsPlugin({
          configFile: path.resolve(process.cwd(), 'tsconfig.json'),
        }),
      ],
    },
  }
})
