import fs from 'fs';
const file = 'src/pages/financial/Cards.tsx';
let txt = fs.readFileSync(file, 'utf8');
txt = txt.replace(/grid grid-cols-2 gap-4/g, 'grid grid-cols-1 sm:grid-cols-2 gap-4');
txt = txt.replace(/w-full max-w-sm bg-white h-full shadow-2xl/g, 'w-full sm:max-w-md bg-white h-full shadow-2xl');
fs.writeFileSync(file, txt);
