const fs = require("fs")
const path = require("path")
const minimist = require("minimist")
console.log('__dirname',__dirname)
const cwd = process.cwd();

const packagePath = path.join(cwd, "package.json")
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"))

const args = minimist(process.argv.slice(2))

// Extract current version parts
const [major, minor, patch] = packageJson.version.split(".").map(Number)

// Update version parts
const newMajor = args.major !== undefined ? Number(args.major) : major
const newMinor = args.minor !== undefined ? Number(args.minor) : minor
let newPatch = args.patch !== undefined ? Number(args.patch) : patch

if (process.argv.length == 2) {
  newPatch++
}

// Set the new version
packageJson.version = `${newMajor}.${newMinor}.${newPatch}`

// Write the updated package.json back to file
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))

console.log(`Updated version to ${packageJson.version}`)
