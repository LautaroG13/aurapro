#!/usr/bin/env node
// Falla si aparece un patrón `\u00XX` literal (backslash + u00 + 2 hex)
// dentro del código fuente. Es el bug que se vio en Vendi: una cadena
// que termina doble-escapada y el usuario ve "é" en vez de "é".
// Un `\uXXXX` real de JS nunca debería llegar así a un string/template
// literal -- si aparece, alguien escapó a mano lo que ya venía escapado
// (o vino así de una respuesta de API/JSON mal decodificada).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;
const EXTENSIONS = new Set([".ts", ".tsx"]);
const PATTERN = /\\u00[0-9a-fA-F]{2}/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (EXTENSIONS.has(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

const offenders = [];
for (const file of walk(ROOT)) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (PATTERN.test(line)) {
      offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length > 0) {
  console.error("Se encontraron patrones \\u00XX literales sin escapar:\n");
  console.error(offenders.join("\n"));
  console.error(
    "\nEsto normalmente significa que un texto llegó doble-escapado y el usuario " +
      "va a ver algo como \"caf\\u00e9\" en vez de \"café\". Revisá el origen del string."
  );
  process.exit(1);
}

console.log(`OK: sin patrones \\u00XX literales en ${walk(ROOT).length} archivos.`);
