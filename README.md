# Obania Metrics App

Aplicação web de gestão operacional para a secção de **impressão** de uma fábrica (Flexografia e Rotogravura). Nasceu para contar RNC (registos de não conformidade) e está a evoluir para um mini sistema de produção/qualidade — com as RNC como um dos indicadores principais, não o único.

> As regras de trabalho deste projeto (git sempre, planear antes de mudar, clareza para quem não conhece a fábrica) estão documentadas em [`CLAUDE.md`](./CLAUDE.md).

## Ideia central

Separar claramente as entidades:

```text
Secção ≠ Máquina ≠ Equipa ≠ Trabalhador ≠ Turno ≠ Registo de produção
```

Isto evita misturar responsabilidades e permite análises mais justas — por exemplo, comparar máquinas ou turnos sem confundir com a equipa que lá estava.

Um registo de produção liga tudo:

```text
Ano/Mês → Secção → Máquina → OF → RNC → Causa → Observações
```

**Fórmulas principais:**

```text
Taxa RNC por 100 OF = (RNC / OF) × 100      → quanto menor, melhor
OF por RNC           = OF / RNC              → quanto maior, melhor
```

Regra de cor: **verde só representa 0 RNC**; qualquer valor acima disso já pede atenção proporcional (âmbar até 5%, vermelho acima).

## Estado atual — versão v4 (React)

A app foi **reconstruída de raiz** em React, mantendo o modelo de dados e os dados já registados. A versão anterior (HTML/CSS/JS puro) fica preservada em [`legacy/`](./legacy) como referência.

**Stack:** Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix) + Recharts, sem servidor — os dados continuam a viver apenas no `localStorage` do dispositivo.

### ✅ Implementado

#### Dashboard
- Seletor de período: ano inteiro ou um mês específico (só aparecem os que já têm dados).
- KPIs com explicação ao passar o cursor (OF, RNC, taxa RNC/100 OF, OF por RNC).
- Índice de Saúde da Produção (0–100), calculado a partir da taxa de RNC, alertas de máquinas, equilíbrio entre secções e evolução recente.
- Gráficos circulares de RNC e OF por secção.
- Ranking das 3 máquinas com mais trabalho e das 3 com mais RNC.
- Alerta automático da pior máquina do período.

#### Produção
- Seletor de ano (pronto para quando houver dados de anos anteriores).
- Gráfico de barras verticais com **todas as máquinas juntas** — Flexografia primeiro, Rotogravura depois — para comparar a secção de impressão como um todo. RNC em destaque numérico ao lado de cada barra. Melhor e pior máquina assinaladas com 👍/👎 e um fundo animado discreto.
- Gráfico de tendência mensal por máquina (OF ou RNC), com paleta de cores acessível (segura para daltonismo) e filtro por secção.
- Um gráfico de evolução mês a mês por secção **e** por cada máquina: OF em barras, RNC em linha, variação percentual face ao mês anterior, e o total do período no canto do cartão. A máquina com melhor produção e a com pior RNC de cada secção ficam destacadas.

#### Em toda a app
- Menu lateral (drawer) com Dashboard, Produção, Estrutura, Fichas, Dados e Assistente IA.
- Tema claro/escuro, guardado no dispositivo.
- "Info" (tooltip) em cada dado importante — máquina, métrica, destaque — a explicar o que significa, para quem não conhece a fábrica conseguir perceber tudo.
- Camada de dados em TypeScript, com o **mesmo modelo JSON v3** e os mesmos dados semeados (Março–Junho 2026) da versão anterior.

### 🚧 Por implementar (próximos ecrãs)

Por ordem prevista:

1. **Estrutura** — gestão das bases da fábrica: secções, máquinas, equipas (associadas a uma máquina específica) e trabalhadores.
2. **Fichas** — página dedicada por entidade (secção, máquina, equipa, trabalhador), com os dados agregados e o histórico de cada uma. A ficha do trabalhador é para estatística e análise, não para culpabilização individual.
3. **Dados** — exportação/importação em JSON, arquivo automático de versões anteriores, e criação rápida de dados ("+ Novo": trabalhador, equipa, máquina, registo RNC rápido).
4. **Assistente IA** — deixado para o fim de propósito. Chat local que responde apenas com base nos dados já registados (nunca inventa valores), tolerante a erros de escrita. Já existia na versão anterior ([`legacy/js/assistant.js`](./legacy/js/assistant.js)) e serve de referência para a reconstrução.

Estes três primeiros ecrãs (Estrutura, Fichas, Dados) ainda mostram apenas um aviso "em construção" na app atual — é o que falta para deixar de depender só dos dados semeados e passar a registar produção nova pela interface.

### Ideias mais a longo prazo

Sincronização opcional com Google Drive (backup/partilha manual entre dispositivos) e importação automática de dados por fotografia de relatório (leitura por IA + pré-confirmação do utilizador). Nenhuma das duas está implementada.

## Modelo de dados v3

```json
{
  "app": "RNC Impressão",
  "version": 3,
  "sections": [],
  "machines": [],
  "teams": [],
  "workers": [],
  "productionRecords": [],
  "rncCauses": [],
  "trainingRecords": [],
  "archives": []
}
```

Exemplo de equipa (associada a uma máquina; secção implícita pela máquina):

```json
{
  "id": "E1 - IF4",
  "name": "E1 · IF4",
  "sectionId": "flexo",
  "machineId": "IF4",
  "shift": "Manhã"
}
```

Exemplo de trabalhador (mostrado em toda a app como "2558 - João Silva"):

```json
{
  "id": "trab-001",
  "number": "2558",
  "name": "João Silva",
  "teamId": "E1 - IF4",
  "shift": "Manhã",
  "nationality": "Portuguesa",
  "yearsPrinting": 12
}
```

Exemplo de registo de produção:

```json
{
  "year": 2026,
  "month": 5,
  "sectionId": "flexo",
  "machineId": "IF4",
  "teamId": "E1 - IF4",
  "shift": "Manhã",
  "workerIds": ["trab-001"],
  "jobs": 165,
  "rnc": 9,
  "cause": "Limpeza",
  "notes": "Exemplo de observação"
}
```

Os dados vivem no `localStorage` do dispositivo (chave `rnc_impressao_v3`), com **arquivo automático** de até 20 versões anteriores antes de qualquer alteração ou importação.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm run build    # compila para produção (dist/)
```

## Estrutura do projeto

```text
src/
  lib/        modelo de dados, agregações, índice de saúde, cores
  components/ AppShell (menu lateral), InfoTip, componentes shadcn/ui
  views/      Dashboard, Production (um ficheiro por ecrã)
legacy/       versão anterior em HTML/CSS/JS puro, preservada como referência
```
