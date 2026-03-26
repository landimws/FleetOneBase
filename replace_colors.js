import fs from 'fs';
import path from 'path';

function replaceColorsInDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceColorsInDir(fullPath);
        } else if (fullPath.endsWith('.css') || fullPath.endsWith('.ejs')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            const replacements = [
                { pattern: /#9d00ff/gi, replace: 'var(--green)' },
                { pattern: /#7a00cc/gi, replace: 'var(--green-dark)' },
                { pattern: /#8500d9/gi, replace: 'var(--green-dark)' },
                { pattern: /#b84dff/gi, replace: 'var(--green-neon)' },
                { pattern: /#7c3aed/gi, replace: 'var(--green)' }, // Login violet
                { pattern: /font-family:\s*['"]?Inter['"]?/gi, replace: "font-family: var(--font-body, 'Plus Jakarta Sans')" },
            ];

            replacements.forEach(({ pattern, replace }) => {
                if (pattern.test(content)) {
                    content = content.replace(pattern, replace);
                    updated = true;
                }
            });

            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log('Colors replaced in ' + fullPath);
            }
        }
    });
}

replaceColorsInDir('./public/css');
replaceColorsInDir('./views');
console.log('Terminado');
