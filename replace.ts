import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace colors
content = content.replace(/#00D18F/g, 'var(--color-accent)');
content = content.replace(/#0B0F19/g, 'var(--color-bg-primary)');
content = content.replace(/#1F2937/g, 'var(--color-bg-secondary)');
content = content.replace(/#111827/g, 'var(--color-bg-tertiary)');

fs.writeFileSync('src/App.tsx', content);
console.log('Replacement done');
