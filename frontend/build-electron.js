#!/usr/bin/env node
/**
 * Build script for Electron main and preload processes
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

try {
  console.log('🔨 Building Electron main process...')

  // Ensure dist-electron directory exists
  const distElectronDir = path.join(__dirname, 'dist-electron')
  if (!fs.existsSync(distElectronDir)) {
    fs.mkdirSync(distElectronDir, { recursive: true })
  }

  // Compile TypeScript for Electron
  execSync('npx tsc -p tsconfig.electron.json', {
    cwd: __dirname,
    stdio: 'inherit',
  })

  console.log('✅ Electron main process built successfully')

  // Copy package.json to dist-electron
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
  )
  
  const electronPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    main: 'electron-main.js',
    type: 'commonjs',
  }

  fs.writeFileSync(
    path.join(distElectronDir, 'package.json'),
    JSON.stringify(electronPackageJson, null, 2)
  )

  console.log('✅ Build complete!')
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}
