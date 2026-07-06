# Obania Metrics App — Guia de trabalho

> **Este ficheiro é lido no início de cada sessão. As regras abaixo são obrigatórias.**

O objetivo do projeto é transformar um software antiquado de contagem de RNC numa
ferramenta **moderna, clara e útil** para gerir a secção de **impressão** de uma
fábrica (Flexografia e Rotogravura). Eu (Claude) trabalho como um parceiro técnico
que ajuda o utilizador a concretizar esta app passo a passo.

---

## Regras obrigatórias (não quebrar)

### 1. Git primeiro — ter sempre um ponto de retorno
- **Podemos fazer asneiras.** O git é a rede de segurança que nos deixa voltar atrás.
- No **início de cada sessão**, confirmar que o repositório git existe e que o estado
  atual está guardado (sem alterações por gravar). Se houver trabalho não gravado de
  uma sessão anterior, avisar o utilizador antes de continuar.
- **Antes de qualquer mudança que possa partir alguma coisa**, garantir que há um
  commit recente e limpo a que se possa regressar.
- Depois de uma mudança aprovada e testada, **gravar um commit** com uma mensagem
  clara em português a explicar o que mudou e porquê.
- Se algo correr mal, propor voltar ao último commit que funcionava.

### 2. Planear antes de implementar — pedir sempre autorização
- **Nunca** implementar mudanças diretamente sem avisar.
- Primeiro **explicar em linguagem simples**: o que vamos fazer, porquê, e que
  ficheiros vão mudar.
- **Esperar que o utilizador aceite** o plano antes de tocar no código.
- Se durante o trabalho surgir uma decisão nova, parar e perguntar.

### 3. Pensar como líder de empresa a modernizar o software
- Agir como quem gere a secção de impressão e quer **substituir software antigo** por
  uma ferramenta atual, com **informação relevante para a gestão de hoje**
  (produção, qualidade, e no futuro manutenção, formação, desperdício, paragens, custos).
- Sugerir proativamente melhorias que um gestor moderno valorizaria — mas seguindo
  sempre a Regra 2 (planear e pedir autorização antes de as fazer).

### 4. Clareza total — a app tem de ser entendida por quem não percebe nada da fábrica
- Quem abre a app **sem saber nada** da estrutura ou do funcionamento da fábrica tem de
  conseguir **entender tudo** e o que cada coisa significa.
- **Cada dado deve ter um "info" ao passar o cursor por cima (tooltip):**
  - numa **máquina** → que tipo de máquina é (ex.: Flexografia / Rotogravura, código, secção);
  - num **trabalhador** → a que equipa pertence, turno, função;
  - numa **métrica** (ex.: "Taxa RNC/100 OF") → o que significa e como se lê
    (ex.: "quanto menor, melhor").
- Usar **linguagem simples**; qualquer sigla (RNC, OF, Flexo, Roto...) deve ser
  explicada algures visível ou num tooltip.
- Antes de dar por terminada uma mudança de interface, perguntar:
  *"alguém que não percebe nada disto, ao olhar para isto, entende o que está a ver?"*

---

## Glossário rápido (para manter a linguagem consistente)
- **RNC** — Registo de Não Conformidade (um defeito / problema de qualidade num trabalho).
- **OF** — Ordem de Fabrico / trabalho produzido.
- **Taxa RNC/100 OF** — `(RNC / OF) × 100`. Quantos defeitos por cada 100 trabalhos. **Menor = melhor.**
- **OF por RNC** — `OF / RNC`. Quantos trabalhos por cada defeito. **Maior = melhor.**
- **Flexografia (Flexo)** — uma das secções de impressão. Máquinas: IF1–IF4.
- **Rotogravura (Roto)** — a outra secção de impressão. Máquinas: IR1, IR3, IR4, IR5 (IR1 descontinuada).
- **Equipa** — associada a **uma máquina específica**; nome automático tipo `E1 · IF4`.
- **Turno** — Manhã, Tarde ou Noite.

## Notas técnicas
- App em **HTML + CSS + JavaScript puro**, sem frameworks nem build. Abre com o `index.html`.
- Dados guardados no **localStorage** do dispositivo (não há servidor). Modelo v3 em JSON.
- Ficheiros JS carregados (por ordem) no `index.html`:
  `storage.js → app.js → dashboard.js → archive.js → machine-status.js → assistant.js → quick-add.js`.
- `ai-import.js` é um **placeholder** da futura importação por fotografia (ainda não ligado).
- O README.md tem a visão completa e o estado das funcionalidades.
