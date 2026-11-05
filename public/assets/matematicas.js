window.RMath = (() => {
  function workedSolution(topic, level, {
    a,
    b,
    x,
    n,
    answer
  }) {
    const d = 3 + n % 7,
      e = d + 1;
    const steps = [];
    const add = (...s) => steps.push(...s);
    if (topic === 'algebra') {
      if (level === 1) add(`Partimos de x + ${b} = ${x + b}.`, `Resta ${b} a ambos lados: x = ${x + b} − ${b}.`, `Resultado: x = ${x}. Comprueba: ${x} + ${b} = ${x + b}.`);else if (level === 2) add(`Partimos de ${a}x = ${a * x}.`, `Divide ambos lados entre ${a}: x = ${a * x}/${a}.`, `Resultado: x = ${x}. Comprueba: ${a} × ${x} = ${a * x}.`);else if (level <= 4) add(`La operación que acompaña a ${a}x es ${level === 4 ? 'restar' : 'sumar'} ${b}.`, `${level === 4 ? 'Suma' : 'Resta'} ${b} en ambos lados: ${a}x = ${a * x}.`, `Divide entre ${a}: x = ${a * x}/${a} = ${x}.`, `Sustituye x = ${x} en la igualdad original para comprobarla.`);else if (level === 5) add(`Resta x en ambos lados: ${a}x + ${b} = ${a * x + b}.`, `Resta ${b}: ${a}x = ${a * x}.`, `Divide entre ${a}: x = ${x}.`);else if (level === 6) add(`Divide ambos lados entre ${a}: x + ${b} = ${x + b}.`, `Resta ${b}: x = ${x + b} − ${b} = ${x}.`, `Comprueba: ${a}(${x} + ${b}) = ${a * (x + b)}.`);else if (level === 7) add(`Resta ${b}: x/${a} = ${x + b} − ${b} = ${x}.`, `Multiplica ambos lados por ${a}: x = ${a} × ${x}.`, `Resultado: x = ${a * x}.`);else if (level <= 9) {
        if (level === 9) add(`Resta ${b}: ${a}x² = ${a * x * x}.`, `Divide entre ${a}: x² = ${x * x}.`);else add(`Partimos de x² = ${x * x}.`);
        add(`Extrae raíz cuadrada: x = ±${x}.`, `La instrucción pide la raíz positiva: x = ${x}.`);
      } else add(`Busca dos números que sumen ${x + 1} y cuyo producto sea ${x}: 1 y ${x}.`, `Factoriza: (x − 1)(x − ${x}) = 0.`, `Iguala cada factor a cero: x = 1 o x = ${x}.`, `La raíz mayor es ${x}.`);
    } else if (topic === 'fracciones') {
      if (level <= 2) add(`Los denominadores son iguales (${d}); el denominador se conserva.`, `${level === 1 ? 'Suma' : 'Resta'} los numeradores: ${level === 1 ? `${b} + 1 = ${b + 1}` : `${b + 1} − 1 = ${b}`}.`, `Resultado: ${level === 1 ? b + 1 : b}/${d}. Puedes simplificarlo o escribir su decimal.`);else if (level === 3) add(`Una fracción representa una división: ${a * d}/${d}.`, `Divide ${a * d} entre ${d}.`, `Resultado: ${a}.`);else if (level <= 5) add(`Usa como denominador común ${d} × ${e} = ${d * e}.`, `Convierte: 1/${d} = ${e}/${d * e} y 1/${e} = ${d}/${d * e}.`, `${level === 5 ? 'Resta' : 'Suma'} numeradores: ${e} ${level === 5 ? '−' : '+'} ${d} = ${level === 5 ? e - d : e + d}.`, `Resultado: ${level === 5 ? e - d : e + d}/${d * e}.`);else if (level === 6) add(`Multiplica los numeradores: ${a} × ${b} = ${a * b}.`, `Multiplica los denominadores: ${d} × ${e} = ${d * e}.`, `Resultado: ${a * b}/${d * e}.`);else if (level === 7) add(`Invierte la segunda fracción: ${b}/${e} pasa a ${e}/${b}.`, `Multiplica: ${a}/${d} × ${e}/${b}.`, `Numerador: ${a} × ${e} = ${a * e}; denominador: ${d} × ${b} = ${d * b}.`, `Resultado: ${a * e}/${d * b}.`);else if (level === 8) add(`Expresa el entero con denominador ${d}: ${a} = ${a * d}/${d}.`, `Suma numeradores: ${a * d} + ${b} = ${a * d + b}.`, `Resultado: ${a * d + b}/${d}.`);else if (level === 9) add(`Resuelve el paréntesis: ${a}/${d} + 1/${d} = ${a + 1}/${d}.`, `Multiplica el numerador por ${b}: (${a + 1} × ${b})/${d}.`, `Resultado: ${(a + 1) * b}/${d}.`);else add(`Usa denominador común ${d * e}: ${a}/${d} = ${a * e}/${d * e} y 1/${e} = ${d}/${d * e}.`, `Suma: ${a * e + d}/${d * e}.`, `Dividir entre ${b} equivale a multiplicar por 1/${b}.`, `Resultado: ${a * e + d}/${d * e * b}.`);
    } else if (topic === 'geometria') {
      if (level === 1) add('Fórmula del área de un rectángulo: A = base × altura.', `Sustituye: A = ${a} × ${b}.`, `Resultado: ${answer} cm².`);else if (level === 2) add('Fórmula del perímetro: P = 2(base + altura).', `Suma: ${a} + ${b} = ${a + b}.`, `Multiplica por 2: P = ${answer} cm.`);else if (level === 3) add('El diámetro equivale a dos radios: d = 2r.', `Sustituye r = ${a}: d = 2 × ${a}.`, `Resultado: ${answer} cm.`);else if (level === 4) add('Fórmula del área de un triángulo: A = base × altura / 2.', `Multiplica: ${a} × ${b} = ${a * b}.`, `Divide entre 2: A = ${answer} cm².`);else if (level === 5) add('Fórmula de la circunferencia: C = 2πr.', `Usa el valor solicitado de π: C = 2 × 3.14 × ${a}.`, `Resultado: ${answer.toFixed(2)} cm.`);else if (level === 6) add('Fórmula del área del círculo: A = πr².', `Eleva el radio al cuadrado: ${a}² = ${a * a}.`, `Multiplica por 3.14: A = ${answer.toFixed(2)} cm².`);else if (level === 7) add('Teorema de Pitágoras: c² = a² + b².', `Cuadrados: ${3 * x}² = ${9 * x * x}; ${4 * x}² = ${16 * x * x}.`, `Suma: c² = ${25 * x * x}.`, `Extrae la raíz: c = ${5 * x} cm.`);else if (level === 8) add('Volumen del prisma: V = largo × ancho × altura.', `Área de la base: ${a} × ${b} = ${a * b}.`, `Multiplica por la altura ${x}: V = ${answer} cm³.`);else if (level === 9) add('Área del trapecio: A = (B + b) × h / 2.', `Suma las bases: ${a + b} + ${a} = ${2 * a + b}.`, `Multiplica por la altura: ${2 * a + b} × ${x} = ${(2 * a + b) * x}.`, `Divide entre 2: A = ${answer} cm².`);else add('Volumen del cilindro: V = πr²h.', `Cuadrado del radio: ${a}² = ${a * a}.`, `Área de la base: 3.14 × ${a * a} = ${(3.14 * a * a).toFixed(2)}.`, `Multiplica por la altura ${b}: V = ${answer.toFixed(2)} cm³.`);
    }
    return steps;
  }

  // Edición local: las preguntas y las respuestas se calculan en el navegador.
  const baseTopics = [{
    id: 'algebra',
    name: 'Álgebra',
    subtitle: 'Dale sentido a la incógnita',
    symbol: 'x',
    color: '#315ff4',
    description: 'Operaciones, ecuaciones y modelos algebraicos.'
  }, {
    id: 'fracciones',
    name: 'Fracciones',
    subtitle: 'Conecta las partes con el todo',
    symbol: '½',
    color: '#7959e8',
    description: 'Equivalencias y operaciones con números racionales.'
  }, {
    id: 'geometria',
    name: 'Geometría',
    subtitle: 'Descubre el espacio que te rodea',
    symbol: '△',
    color: '#158571',
    description: 'Perímetros, áreas y volúmenes en situaciones cotidianas.'
  }];
  const baseLessons = [['algebra', 'Despeja tu primera ecuación', 1, 'Una ecuación expresa una igualdad. Para despejar x, aplica la misma operación a ambos lados.', '2x + 4 = 14', ['Resta 4 en ambos lados: 2x = 10.', 'Divide ambos lados entre 2: x = 5.', 'Comprueba: 2(5) + 4 = 14.']], ['algebra', 'Variables en ambos lados', 5, 'Agrupa los términos con x a un lado y los números al otro. Conserva siempre la igualdad.', '3x + 2 = x + 10', ['Resta x: 2x + 2 = 10.', 'Resta 2: 2x = 8.', 'Divide entre 2: x = 4.']], ['algebra', 'Ecuaciones cuadráticas', 8, 'Si una ecuación queda como x² = a y a es positivo, tiene dos soluciones reales: la raíz positiva y la negativa.', 'x² = 49', ['Obtén la raíz cuadrada de 49: 7.', 'Las soluciones son x = 7 y x = −7.', 'Si te piden la raíz positiva, responde 7.']], ['fracciones', 'Suma con el mismo denominador', 1, 'El denominador indica en cuántas partes se divide el todo. Para sumar partes iguales, suma los numeradores.', '1/4 + 2/4 = 3/4', ['Identifica el denominador común: 4.', 'Suma los numeradores: 1 + 2 = 3.', 'Conserva el denominador: 3/4 = 0.75.']], ['fracciones', 'Denominadores diferentes', 4, 'Convierte las fracciones en otras equivalentes con un denominador común antes de sumarlas.', '1/2 + 1/3 = 5/6', ['Un denominador común es 6.', 'Convierte: 1/2 = 3/6 y 1/3 = 2/6.', 'Suma: 3/6 + 2/6 = 5/6.']], ['fracciones', 'Multiplica y divide', 7, 'Para multiplicar, multiplica numeradores y denominadores. Para dividir, multiplica por el recíproco de la segunda fracción.', '2/3 ÷ 4/5 = 5/6', ['Invierte la segunda fracción: 5/4.', 'Multiplica: (2×5)/(3×4) = 10/12.', 'Simplifica: 10/12 = 5/6.']], ['geometria', 'Área y perímetro', 1, 'El perímetro mide el contorno; el área mide la superficie. En un rectángulo: P = 2(b + h), A = b × h.', 'Base 6 cm, altura 4 cm → A = 24 cm²', ['Identifica base y altura.', 'Multiplica 6 × 4 = 24.', 'Expresa el área en cm².']], ['geometria', 'Triángulos y círculos', 4, 'El área de un triángulo es b × h / 2. El área de un círculo es πr². El diámetro es el doble del radio.', 'Triángulo: b = 8 cm, h = 5 cm → A = 20 cm²', ['Multiplica base y altura: 8 × 5 = 40.', 'Divide entre 2: 40 / 2 = 20.', 'En los ejercicios usa π = 3.14 cuando se indique.']], ['geometria', 'Pitágoras y volumen', 7, 'En un triángulo rectángulo, c² = a² + b². El volumen de un prisma rectangular es largo × ancho × alto.', 'Catetos 3 y 4 → hipotenusa 5', ['Calcula los cuadrados: 3² + 4² = 9 + 16.', 'La suma es 25.', 'La raíz cuadrada de 25 es 5.']]];
  // Ampliación de la ruta didáctica: las claves iniciales se conservan al actualizar.
  baseLessons.push(['algebra', 'Multiplicación y despeje', 2, 'Si un número multiplica a x, divide ambos lados por ese número. Dividir solamente un lado rompería la igualdad.', '4x = 28', ['El coeficiente de x es 4.', 'Divide ambos lados entre 4: x = 28/4.', 'Comprueba: x = 7 y 4(7) = 28.']], ['algebra', 'Paréntesis y propiedad distributiva', 6, 'Puedes distribuir el factor o dividir primero ambos lados entre él. Elige la ruta que produzca menos pasos.', '3(x + 2) = 21', ['Divide entre 3: x + 2 = 7.', 'Resta 2 en ambos lados: x = 5.', 'Comprueba: 3(5 + 2) = 21.']], ['algebra', 'Factorización y raíces', 10, 'Si un producto es cero, al menos uno de sus factores es cero. Factorizar una cuadrática permite encontrar sus raíces sin probar valores al azar.', 'x² − 7x + 6 = 0', ['Busca dos números que sumen 7 y cuyo producto sea 6: 1 y 6.', 'Factoriza: (x − 1)(x − 6) = 0.', 'Las raíces son 1 y 6. Si te piden la mayor, responde 6.']], ['fracciones', 'De fracción a número entero', 3, 'Una fracción representa una división. Cuando el numerador es múltiplo del denominador, el resultado es un entero.', '18/6 = 3', ['Interpreta la fracción como 18 ÷ 6.', 'Pregunta cuántas veces cabe 6 en 18: tres.', 'Comprueba: 3 × 6 = 18.']], ['fracciones', 'Productos de fracciones', 6, 'Multiplica los numeradores entre sí y los denominadores entre sí. Al final, simplifica dividiendo ambos por un factor común.', '2/3 × 3/4 = 1/2', ['Multiplica: (2 × 3)/(3 × 4) = 6/12.', 'Divide numerador y denominador entre 6: 1/2.', 'También puedes comprobar: 1/2 = 0.5.']], ['fracciones', 'Operaciones combinadas', 10, 'Resuelve primero los paréntesis. Para sumar denominadores diferentes utiliza fracciones equivalentes; después realiza la división indicada.', '(1/2 + 1/3) ÷ 2 = 5/12', ['Suma en el paréntesis: 3/6 + 2/6 = 5/6.', 'Dividir entre 2 equivale a multiplicar por 1/2.', '(5/6)(1/2) = 5/12.']], ['geometria', 'Del radio al diámetro', 3, 'El radio une el centro del círculo con su borde. El diámetro pasa por el centro y abarca dos radios, por lo tanto d = 2r.', 'Radio 2 m → diámetro 4 m', ['Identifica el radio: r = 2 m.', 'Aplica d = 2r: 2 × 2 = 4.', 'El diámetro es 4 m; conserva la misma unidad.']], ['geometria', 'Superficie de un círculo', 6, 'El área de un círculo es π por el cuadrado del radio. Elevar al cuadrado afecta al radio completo. Usa π = 3.14 cuando el ejercicio lo pida.', 'Radio 3 cm → área 28.26 cm²', ['Eleva el radio al cuadrado: 3² = 9.', 'Multiplica por π: 3.14 × 9 = 28.26.', 'Escribe el área en unidades cuadradas: cm².']], ['geometria', 'Volumen de un cilindro', 10, 'Un cilindro tiene una base circular. Su volumen es el área de esa base multiplicada por la altura: V = πr²h.', 'Radio 2 cm y altura 5 cm → volumen 62.8 cm³', ['Área de la base: 3.14 × 2² = 12.56 cm².', 'Multiplica por la altura: 12.56 × 5 = 62.8.', 'El volumen se expresa en cm³.']]);
  function parseAnswer(input) {
    if (typeof input !== 'string' || input.length > 80) return NaN;
    const s = input.trim().replace(',', '.');
    const numeric = '[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
    if (new RegExp(`^${numeric}$`).test(s)) return Number(s);
    if (new RegExp(`^${numeric}\\s*/\\s*${numeric}$`).test(s)) {
      const [a, b] = s.split('/').map(Number);
      return b === 0 ? NaN : a / b;
    }
    return NaN;
  }
  function generateQuestion(topic, level, seed) {
    const n = (Number(seed) >>> 0) % 997,
      a = 2 + n % 7,
      b = 1 + Math.floor(n / 7) % 8,
      x = 1 + Math.floor(n / 11) % 9;
    let prompt,
      instruction = 'Escribe tu respuesta numérica.',
      answer,
      explanation;
    if (topic === 'algebra') {
      if (level === 1) {
        prompt = `x + ${b} = ${x + b}`;
        answer = x;
        explanation = `Resta ${b} en ambos lados: x = ${x}.`;
      } else if (level === 2) {
        prompt = `${a}x = ${a * x}`;
        answer = x;
        explanation = `Divide entre ${a}: x = ${x}.`;
      } else if (level <= 4) {
        prompt = `${a}x ${level === 4 ? '−' : '+'} ${b} = ${a * x + (level === 4 ? -b : b)}`;
        answer = x;
        explanation = `${level === 4 ? 'Suma' : 'Resta'} ${b} y divide entre ${a}: x = ${x}.`;
      } else if (level === 5) {
        prompt = `${a + 1}x + ${b} = x + ${a * x + b}`;
        answer = x;
        explanation = `Resta x y ${b}: ${a}x = ${a * x}. Por tanto x = ${x}.`;
      } else if (level === 6) {
        prompt = `${a}(x + ${b}) = ${a * (x + b)}`;
        answer = x;
        explanation = `Divide entre ${a} y resta ${b}: x = ${x}.`;
      } else if (level === 7) {
        prompt = `x/${a} + ${b} = ${x + b}`;
        answer = a * x;
        explanation = `Resta ${b}: x/${a} = ${x}. Multiplica por ${a}: x = ${a * x}.`;
      } else if (level <= 9) {
        prompt = level === 8 ? `x² = ${x * x}` : `${a}x² + ${b} = ${a * x * x + b}`;
        instruction = 'Encuentra la solución positiva de x.';
        answer = x;
        explanation = `${level === 9 ? `Resta ${b} y divide entre ${a}. ` : ''}x² = ${x * x}. La raíz positiva es ${x}.`;
      } else {
        prompt = `x² − ${x + 1}x + ${x} = 0`;
        instruction = 'Escribe la mayor de las dos raíces.';
        answer = x;
        explanation = `Factoriza: (x − 1)(x − ${x}) = 0. Las raíces son 1 y ${x}; la mayor es ${x}.`;
      }
    } else if (topic === 'fracciones') {
      const d = 3 + n % 7,
        e = d + 1;
      instruction = 'Responde con una fracción o un decimal (al menos 3 decimales si no es exacto).';
      if (level === 1) {
        prompt = `${b}/${d} + 1/${d}`;
        answer = (b + 1) / d;
        explanation = `Suma los numeradores: ${b + 1}/${d}.`;
      } else if (level === 2) {
        prompt = `${b + 1}/${d} − 1/${d}`;
        answer = b / d;
        explanation = `Resta los numeradores: ${b}/${d}.`;
      } else if (level === 3) {
        prompt = `Convierte ${a * d}/${d} a número entero`;
        answer = a;
        explanation = `Divide el numerador entre el denominador: ${a * d} ÷ ${d} = ${a}.`;
      } else if (level <= 5) {
        prompt = `1/${d} ${level === 5 ? '−' : '+'} 1/${e}`;
        answer = level === 5 ? 1 / d - 1 / e : 1 / d + 1 / e;
        explanation = `Denominador común: ${d * e}. Numerador: ${e} ${level === 5 ? '−' : '+'} ${d}. Resultado: ${level === 5 ? e - d : e + d}/${d * e}.`;
      } else if (level === 6) {
        prompt = `${a}/${d} × ${b}/${e}`;
        answer = a * b / (d * e);
        explanation = `Multiplica numeradores y denominadores: ${a * b}/${d * e}.`;
      } else if (level === 7) {
        prompt = `${a}/${d} ÷ ${b}/${e}`;
        answer = a * e / (d * b);
        explanation = `Multiplica por el recíproco: (${a} × ${e})/(${d} × ${b}) = ${a * e}/${d * b}.`;
      } else if (level === 8) {
        prompt = `${a} + ${b}/${d}`;
        answer = a + b / d;
        explanation = `Convierte el entero: ${a * d}/${d}. Suma: ${a * d + b}/${d}.`;
      } else if (level === 9) {
        prompt = `(${a}/${d} + 1/${d}) × ${b}`;
        answer = (a + 1) * b / d;
        explanation = `Primero suma: ${a + 1}/${d}; luego multiplica por ${b}: ${(a + 1) * b}/${d}.`;
      } else {
        prompt = `(${a}/${d} + 1/${e}) ÷ ${b}`;
        answer = (a / d + 1 / e) / b;
        explanation = `Suma con denominador ${d * e}: ${a * e + d}/${d * e}. Divide entre ${b}: ${a * e + d}/${d * e * b}.`;
      }
    } else if (topic === 'geometria') {
      if (level <= 2) {
        prompt = `Rectángulo de base ${a} cm y altura ${b} cm`;
        instruction = level === 1 ? 'Calcula el área en cm².' : 'Calcula el perímetro en cm.';
        answer = level === 1 ? a * b : 2 * (a + b);
        explanation = level === 1 ? `Área = ${a} × ${b} = ${answer} cm².` : `Perímetro = 2(${a} + ${b}) = ${answer} cm.`;
      } else if (level === 3) {
        prompt = `Un círculo tiene radio ${a} cm`;
        instruction = 'Calcula su diámetro en cm.';
        answer = 2 * a;
        explanation = `Diámetro = 2 × radio = ${answer} cm.`;
      } else if (level === 4) {
        prompt = `Triángulo: base ${a} cm, altura ${b} cm`;
        instruction = 'Calcula el área en cm².';
        answer = a * b / 2;
        explanation = `Área = (${a} × ${b})/2 = ${answer} cm².`;
      } else if (level <= 6) {
        prompt = `Círculo: radio ${a} cm. Usa π = 3.14`;
        instruction = level === 5 ? 'Calcula la longitud de la circunferencia en cm.' : 'Calcula el área en cm².';
        answer = level === 5 ? 2 * 3.14 * a : 3.14 * a * a;
        explanation = level === 5 ? `C = 2πr = 2 × 3.14 × ${a} = ${answer.toFixed(2)} cm.` : `A = πr² = 3.14 × ${a}² = ${answer.toFixed(2)} cm².`;
      } else if (level === 7) {
        prompt = `Triángulo rectángulo con catetos ${3 * x} y ${4 * x} cm`;
        instruction = 'Calcula la hipotenusa en cm.';
        answer = 5 * x;
        explanation = `c = √(${3 * x}² + ${4 * x}²) = ${5 * x} cm.`;
      } else if (level === 8) {
        prompt = `Prisma rectangular: ${a} cm × ${b} cm × ${x} cm`;
        instruction = 'Calcula el volumen en cm³.';
        answer = a * b * x;
        explanation = `V = ${a} × ${b} × ${x} = ${answer} cm³.`;
      } else if (level === 9) {
        prompt = `Trapecio: bases ${a + b} y ${a} cm, altura ${x} cm`;
        instruction = 'Calcula el área en cm².';
        answer = (2 * a + b) * x / 2;
        explanation = `A = (B + b)h/2 = (${a + b} + ${a}) × ${x}/2 = ${answer} cm².`;
      } else {
        prompt = `Cilindro: radio ${a} cm, altura ${b} cm. Usa π = 3.14`;
        instruction = 'Calcula el volumen en cm³.';
        answer = 3.14 * a * a * b;
        explanation = `V = πr²h = 3.14 × ${a}² × ${b} = ${answer.toFixed(2)} cm³.`;
      }
    } else throw new Error('Este tema requiere ejercicios del banco.');
    return {
      prompt,
      instruction,
      answer,
      explanation,
      solution_steps: workedSolution(topic, level, {
        a,
        b,
        x,
        n,
        answer
      }),
      tolerance: 0.001
    };
  }
  return {
    baseTopics,
    baseLessons,
    parseAnswer,
    generateQuestion
  };
})();
