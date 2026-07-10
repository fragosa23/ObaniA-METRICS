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

#### Dashboard (visual moderno)
- Seletor de período: ano inteiro ou um mês específico (só aparecem os que já têm dados).
- KPIs com contagem animada, mini-gráfico dos meses (sparkline) e **variação face ao período anterior** (▲/▼, verde = bom, vermelho = mau).
- **Meta da taxa de RNC** (definida em Configurações) visível junto à taxa.
- Índice de Saúde da Produção (0–100) num **anel animado com brilho**, calculado a partir da taxa de RNC, alertas de máquinas **ativas**, equilíbrio entre secções e evolução recente.
- Gráficos circulares de RNC e OF por secção; rankings de máquinas.
- Alertas honestos: a pior máquina é sempre uma **ativa**; as descontinuadas aparecem só como nota.
- Entradas em cascata, cartões com elevação ao passar por cima, fundo com brilhos suaves — tudo desativado automaticamente para quem prefere menos movimento (prefers-reduced-motion).

#### Assistente ObaniA 🤖
- Mascote da app num balão flutuante no Dashboard, com **sugestões sobre o período selecionado**: máquinas acima da meta, taxa a subir/descer, meses sem registos, RNC sem causa, máquinas sem defeitos.
- **Análises por gráfico na Produção e na ficha da máquina**: um ícone do ObaniA no canto de cada gráfico abre a análise desse gráfico em concreto (ex.: "IF3 é a melhor máquina do ano; os RNC subiram em Junho mas a média continua melhor que a das outras").
- Baseado **apenas nos dados registados** (regras locais) — nunca inventa valores.
- A cruz do balão só o recolhe; **desligar de vez faz-se em Configurações**. Em ecrãs pequenos começa recolhido para não tapar conteúdo.

#### Dados (o único sítio onde se edita)
- **Lançar relatório mensal** — o papel que costumam fornecer, em digital: escolhe o mês, preenche OF e RNC por máquina numa grelha (pré-preenchida se o mês já tiver valores) e guarda tudo de uma vez.
- **Registos de não conformidade** — lista por mês; clicar num registo abre-o para ver/editar (OF, RNC, causa, observações); "+ Novo registo" para criar.
- **Fichas — criar e editar** — separadores Máquinas / Áreas / Equipas / Trabalhadores, cada um com "+ Novo", editar e apagar. O botão **"Editar"** de qualquer ficha (nas Fichas ou na Estrutura) abre aqui o formulário certo, já preenchido.
- **Cópia de segurança** — exportar/importar JSON e restaurar **arquivos automáticos** (a app guarda a versão anterior antes de cada alteração ou importação).
- **Histórico de alterações** — tudo o que foi criado, editado ou apagado, com os campos que mudaram (de → para). Cada ficha (máquina, equipa, trabalhador) mostra também o seu próprio historial.

#### Navegação
- **Botão Voltar** no cabeçalho: percorre o caminho todo para trás, passo a passo (ficha → lista → ecrã anterior…), por muito fundo que se tenha navegado.
- Navegação cruzada em toda a app: mapa → fichas, equipa ↔ trabalhador ↔ máquina, ficha → Produção, ficha → edição nos Dados.

#### Configurações
- Ligar/desligar o assistente ObaniA (preferência do dispositivo).
- **Meta da taxa de RNC** (viaja com a exportação de dados).
- **Horários e Turnos**: gerir os horários disponíveis para equipas de turno fixo.

#### Fichas (tudo ligado)
- Ficha de cada **máquina**: dados técnicos, gráfico de produção do ano (clicar leva à página Produção), análise do ObaniA, equipas e membros — todos clicáveis.
- Ficha de cada **trabalhador**: idade (calculada da data de nascimento), percurso de funções (cronologia com durações), tempo por equipa (com gráfico circular), observações.
- Ficha de cada **equipa**: máquina (→ ficha da máquina), regime de turno, membros (→ fichas individuais).
- **Navegação cruzada em toda a app**: do mapa da fábrica para as fichas, de uma ficha para outra, e das fichas para a Produção.
- Nota honesta: a produção por pessoa/equipa fica indisponível **até os registos de OF identificarem quem os produziu** — a app não finge dados que não tem.

#### Produção
- Seletor de ano (pronto para quando houver dados de anos anteriores).
- Gráfico de barras verticais com **todas as máquinas juntas** — Flexografia primeiro, Rotogravura depois — para comparar a secção de impressão como um todo. RNC em destaque numérico ao lado de cada barra. Melhor e pior máquina assinaladas com 👍/👎 e um fundo animado discreto.
- Gráfico de tendência mensal por máquina (OF ou RNC), com paleta de cores acessível (segura para daltonismo) e filtro por secção.
- Um gráfico de evolução mês a mês por secção **e** por cada máquina: OF em barras, RNC em linha, variação percentual face ao mês anterior, e o total do período no canto do cartão. A máquina com melhor produção e a com pior RNC de cada secção ficam destacadas.

#### Estrutura (só consulta)
- Três separadores: **Máquinas e Áreas**, **Equipas** e **Trabalhadores** — tudo clicável, tudo leva à ficha respetiva. **Criar/editar/apagar faz-se apenas no menu Dados** (assim ninguém altera nada por engano).
- **Máquinas e Áreas** — um **mapa da fábrica** (estilo jogo de estratégia): cada máquina é uma unidade desenhada com o nome por cima e uma luz de estado (verde a pulsar = ativa, vermelha = descontinuada), agrupada por secção (Flexografia, Rotogravura, **Offset**) e com as **áreas de apoio** na sua zona. Clicar numa unidade faz zoom: equipas, turnos e membros dessa máquina, com **"Ficha completa"** e atalho **"Editar nos Dados"**.
- **Equipas** — cada equipa associada a uma máquina, com **regime de turno** (rotativo M/T/N, rotativo M/T, ou fixo com turno + horário). A distribuição de turnos cumpridos aparecerá quando os registos de produção identificarem a equipa.
- **Trabalhadores** — lista com total, **pesquisa por nº/nome e filtro por equipa**, função, equipa, idade calculada da data de nascimento e tempo a imprimir. Ao mudar de equipa ou função, o **histórico atualiza-se sozinho** (fecha a passagem anterior e abre a nova, com datas).

> **Nota de honestidade dos dados:** os registos de OF importados das fotografias **não identificam** que equipa/turno/pessoa os produziu. Por isso, equipas e trabalhadores são por agora **meramente informativos** — nenhum gráfico de produção lhes atribui OF ou RNC.

#### Em toda a app
- Menu lateral (drawer) com Dashboard, Produção, Estrutura, Fichas, Dados e Assistente IA.
- Tema claro/escuro, guardado no dispositivo.
- "Info" (tooltip) em cada dado importante — máquina, métrica, destaque — a explicar o que significa, para quem não conhece a fábrica conseguir perceber tudo.
- Camada de dados em TypeScript, com o **mesmo modelo JSON v3** e os mesmos dados semeados (Março–Junho 2026) da versão anterior.

### 🚧 Por implementar (próximos ecrãs)

Por ordem prevista:

1. **Assistente IA (chat)** — o ecrã de conversa: perguntar coisas aos dados por escrito. O balão ObaniA do Dashboard é a face proativa do mesmo cérebro; o chat será a face reativa. Referência: [`legacy/js/assistant.js`](./legacy/js/assistant.js).
2. **Análises seguintes** — comparação de períodos lado a lado, análise de causas de RNC (Pareto — as causas já se registam no ecrã Dados), desempenho por turno, relatório mensal imprimível. Mais além: paragens/OEE, manutenção, desperdício, formação.

### Ideias mais a longo prazo

Sincronização opcional com Google Drive (backup/partilha manual entre dispositivos) e importação automática de dados por fotografia de relatório (leitura por IA + pré-confirmação do utilizador). Nenhuma das duas está implementada.

## Modelo de dados v3

```json
{
  "app": "RNC Impressão",
  "version": 3,
  "sections": [],
  "workAreas": [],
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
