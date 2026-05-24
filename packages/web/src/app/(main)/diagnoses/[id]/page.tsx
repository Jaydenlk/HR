const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(process.argv[1], 'utf8');
const target = path.join('E:', 'Agent program', 'HRBP', 'packages', 'web', 'src', 'app', '(main)', 'diagnoses', '[id]', 'page.tsx');
fs.writeFileSync(target, content, 'utf8');
console.log('Written: ' + fs.statSync(target).size + ' bytes');
