import fs from 'fs';

let content = fs.readFileSync('src/App.jsx', 'utf8');

const replacements = {
  'bg-\\[#0b0f19\\]': 'bg-white dark:bg-[#0b0f19]',
  'bg-\\[#111827\\]': 'bg-slate-50 dark:bg-[#111827]',
  'bg-\\[#0c1222\\]': 'bg-slate-100 dark:bg-[#0c1222]',
  'bg-\\[#030712\\]': 'bg-slate-100 dark:bg-[#030712]',
  'bg-\\[#0f172a\\]': 'bg-white dark:bg-[#0f172a]',
  'bg-slate-950': 'bg-slate-100 dark:bg-slate-950',
  'bg-slate-900': 'bg-slate-200 dark:bg-slate-900',
  'bg-slate-800': 'bg-gray-300 dark:bg-slate-800',
  'border-slate-800': 'border-slate-300 dark:border-slate-800',
  'border-slate-700': 'border-slate-300 dark:border-slate-700',
  'border-slate-600': 'border-slate-400 dark:border-slate-600',
  'text-slate-400': 'text-slate-600 dark:text-slate-400',
  'text-slate-300': 'text-slate-700 dark:text-slate-300',
  'text-slate-200': 'text-slate-800 dark:text-slate-200',
  'text-white': 'text-slate-900 dark:text-white',
  // Make sure we don't mess up text cases that should stay white
};

for (const [key, value] of Object.entries(replacements)) {
  const regex = new RegExp(key, 'g');
  content = content.replace(regex, value);
}

// Additional specific fixes
content = content.replace(/text-white text-xs/g, 'text-slate-900 dark:text-white text-xs');
// Add Moon to lucide-react imports
content = content.replace(/import \{ \n  Settings/g, 'import { \n  Moon, Settings');
content = content.replace(/import \{ \r?\n  Settings/g, 'import { \n  Moon, Settings');

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx color refactor complete');
