const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=========================================');
console.log('   EJECUTOR DE PRUEBAS E2E - LIVERPOOL');
console.log('=========================================');
console.log('1. Modo Headless (Por defecto - sin ventana)');
console.log('2. Modo Headed   (Visual - abre el navegador)');
console.log('=========================================\n');

rl.question('Elige una opción [1 o 2] (Enter = 1): ', (respuesta) => {
  const opcion = respuesta.trim();
  
  // Si elige '2', añade --headed; para cualquier otra cosa (o Enter), corre headless por defecto
  const comando = opcion === '2' 
    ? 'npx playwright test --headed' 
    : 'npx playwright test';

  console.log(`\n> Ejecutando: ${comando}\n`);
  rl.close();

  try {
    execSync(comando, { stdio: 'inherit' });
  } catch (error) {
    // Evita que Node imprima un stacktrace feo si alguna prueba falla
    process.exit(1);
  }
});
