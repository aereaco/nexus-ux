const { runFromPackage, getFromPackageDotJson, writeToPackageDotJson, ask } = require('./utils')

const version = getFromPackageDotJson('docs', 'version')

const match = version.match(/revision\.([0-9]+)/)

if (!match) {
    console.log('Unable to parse docs version: '+ version)
    process.exit(1)
}

const revision = match[1]

const newVersion = version.replace('revision.'+revision, 'revision.'+(Number(revision) + 1))

console.log('Bumping docs from '+version+' to '+newVersion);

writeToPackageDotJson('docs', 'version', newVersion)

console.log('Publishing on NPM...');

runFromPackage('docs', 'npm publish --access public')

setTimeout(() => {
    ask('Do you want to deploy this new version to the docs site?', () => deploy())
}, 1000)

function deploy() {
    let https = require('https');
    let { DOCS_DEPLOY_URL } = require('./.env.json')

    https.get(DOCS_DEPLOY_URL, (resp: any) => {
        resp.on('end', () => console.log('\n\n Successfully deployed!'))
    }).on("error", (err: any) => console.log("Error: " + err.message));
}

export {}
