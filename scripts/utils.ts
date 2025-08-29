const DotJson = require('dot-json');
const { exec } = require('child_process')

export function runFromPackage(packageName: any, command: any) {
    exec(command, { cwd: __dirname+'/../packages/'+packageName })
}

export function run(command: any) {
    exec(command, { cwd: __dirname+'/..' })
}

export function writeToPackageDotJson(packageName: any, key: any, value: any) {
    let dotJson = new DotJson(`./packages/${packageName}/package.json`)

    dotJson.set(key, value).save()
}

export function getFromPackageDotJson(packageName: any, key: any) {
    let dotJson = new DotJson(`./packages/${packageName}/package.json`)

    return dotJson.get(key)
}

export async function ask(message: any, callback: any) {
    let readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    readline.question(message, (answer: any) => {
        if (['y', 'Y', 'yes', 'Yes', 'YES'].includes(answer)) callback()

        readline.close()
    })
}

