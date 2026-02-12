import fs from 'fs';
try {
    const content = fs.readFileSync('debug_output.txt', 'utf8');
    console.log(content);
} catch (e) {
    console.error('Erro ao ler arquivo:', e.message);
}
