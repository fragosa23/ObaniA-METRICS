/**
 * Integração futura com IA/OCR.
 *
 * Objetivo:
 * - receber uma fotografia de relatório/quadro/gráfico;
 * - extrair máquinas, secções, OF/trabalhos e RNC;
 * - normalizar os dados;
 * - pedir confirmação ao utilizador;
 * - preencher automaticamente o formulário mensal.
 *
 * Formato esperado:
 * [
 *   { machine: "IF1", section: "Flexografia", of: 150, rnc: 5 },
 *   { machine: "IR1", section: "Rotogravura", of: 10, rnc: 2 }
 * ]
 */

async function importDataFromImage(file){
  throw new Error("Importação por IA ainda não implementada.");
}

function normalizeAiRows(rows){
  return rows.map(row=>({
    m:String(row.machine||"").toUpperCase().trim(),
    s:row.section,
    of:Number(row.of||0),
    rnc:Number(row.rnc||0)
  }));
}
