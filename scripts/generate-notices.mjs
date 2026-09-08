import {readFile, writeFile, mkdir, readdir, copyFile} from 'node:fs/promises';
import path from 'node:path';

// Include verbatim notices from installed packages, including vendored subdirectories.
// No network access is needed during generation.
const output = 'public/legal';
await mkdir(output, {recursive: true});
await copyFile('LICENSE', `${output}/LICENSE.txt`);
await copyFile('NOTICE.md', `${output}/NOTICE.txt`);
const legacy = await readFile('docs/legacy-examples.md', 'utf8');
await writeFile(`${output}/original-credits.txt`, legacy.slice(legacy.indexOf('## 🙏 Credits'), legacy.indexOf('### Köthen sample hunt')));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const sections = ['THIRD-PARTY LICENSES AND NOTICES\nIndividual components retain the terms reproduced below.\nSource package versions are recorded in package-lock.json.'];
async function collect(directory) {
  for (const entry of (await readdir(directory, {withFileTypes: true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (entry.isFile() && /^(licen[cs]e|copying|copyright|notice|authors)([.-]|$)/i.test(entry.name)) {
      sections.push(`\n===== ${file} =====\n${await readFile(file, 'utf8')}`);
    }
  }
}
sections.push('\nPACKAGE INVENTORY\n' + Object.entries(lock.packages).filter(([key])=>key).map(([key,p])=>`${key} | ${p.version} | ${p.license ?? 'See package notices'}`).join('\n'));
await collect('licenses');
await collect('node_modules');
await writeFile(`${output}/third-party-notices.txt`, sections.join('\n'));
console.log(`Generated legal documents and ${sections.length - 2} notice files in ${output}.`);
