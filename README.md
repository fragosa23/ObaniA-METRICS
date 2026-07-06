# Obania Metrics App 

Aplicação web para gestão operacional da área de impressão, pensada para começar simples e evoluir para um mini sistema de produção/qualidade.

A ideia deixou de ser apenas contar RNC. A aplicação passa a ser centrada na **produção**, com as RNC como um dos indicadores principais.

## Ideia central

Separar claramente as entidades:

```text
Secção ≠ Máquina ≠ Equipa ≠ Trabalhador ≠ Turno ≠ Registo de produção
```

Isto evita misturar responsabilidades e permite análises mais justas.

Cada **equipa** está associada a **uma máquina específica** (não só à secção). O nome é sugerido automaticamente no formato `E{n} · {máquina}` (ex: `E1 · IR3`), mas pode ser editado. A secção da equipa fica implícita pela máquina escolhida.

Cada **trabalhador** é identificado em toda a app no formato `número mecanográfico - nome` (ex: `2558 - Saulo Ferreira`). A equipa de um trabalhador é definida pelo campo "Equipa" na sua ficha; a ficha da equipa mostra a lista de membros calculada a partir disso.

Um registo de produção liga tudo:

```text
Mês/Ano → Secção → Máquina → OF → RNC → Causa → Observações
```

## Interface

- **Menu lateral (drawer)**: acedido pelo ícone hamburger no canto superior esquerdo da topbar. Desliza a partir da esquerda com overlay; fecha ao escolher uma opção, clicar fora ou premir Escape. Substitui a antiga fila de botões no topo.
- **Tema claro/escuro**: alternável através de um botão dentro do menu lateral; a escolha fica guardada no dispositivo.
- **Marca**: a app apresenta-se como **Obania Metrics App** na topbar.

## Módulos da aplicação

### 1. Dashboard

Ecrã inicial ao abrir a app. Visão rápida do ano atual e acumulado geral:

- total de OF/trabalhos;
- total de RNC;
- taxa RNC por 100 OF;
- índice de saúde da produção (0 a 100);
- RNC e OF por secção (gráfico circular);
- ranking de máquinas com mais trabalho e com mais RNC;
- alertas principais.

Não inclui gráficos de tendência histórica nem previsões automáticas — foram removidos por serem pouco úteis na prática.

### 2. Produção

Registo mensal de produção:

- ano;
- mês;
- secção;
- máquina;
- equipa;
- turno: manhã, tarde ou noite;
- trabalhadores presentes;
- OF/trabalhos;
- RNC;
- causa principal;
- observações.

### 3. Estrutura operacional

Gestão das bases da fábrica:

- secções;
- máquinas;
- equipas;
- trabalhadores;
- turno habitual da equipa;
- turno habitual do trabalhador.

Máquinas iniciais:

- Flexografia: IF1, IF2, IF3, IF4;
- Rotogravura: IR1, IR3, IR4, IR5.

### 4. Fichas

Cada entidade deve ter uma ficha própria.

#### Ficha da secção

- OF;
- RNC;
- taxa RNC/100 OF;
- máquinas associadas;
- equipas associadas.

#### Ficha da máquina

- secção;
- fabricante;
- ano;
- dados técnicos futuros;
- OF;
- RNC;
- taxa;
- equipas que trabalharam nela;
- histórico.

#### Ficha da equipa

- secção habitual;
- turno habitual: manhã, tarde ou noite;
- membros;
- OF;
- RNC;
- taxa;
- evolução futura.

#### Ficha do trabalhador

A ficha do trabalhador é para **estatística e análise**, não para culpabilização.

Campos previstos:

- nome;
- número mecanográfico;
- nacionalidade;
- data de nascimento;
- idade calculada;
- função;
- equipa atual;
- turno habitual: manhã, tarde ou noite;
- anos na empresa;
- anos na impressão;
- escolaridade ;
- idiomas ;
- máquinas autorizadas ;
- formações ;
- competências ;
- observações.

Os dados de desempenho do trabalhador são calculados a partir dos registos em que ele esteve presente. A aplicação deve deixar claro que isto não prova responsabilidade individual por uma RNC.

### 5. Estatística

Objetivo: permitir cruzamentos como:

- experiência média em impressão;
- nacionalidades por secção/equipa;
- idade média por equipa;
- equipas com melhor taxa;
- máquinas com mais RNC;
- produção por turno;
- RNC por turno;
- taxa RNC/100 OF por turno;
- comparação entre manhã, tarde e noite;
- impacto de experiência/formação na taxa de RNC;
- comparação antes/depois de formação;
- melhores combinações equipa + máquina + turno.

### 6. Dados

Exportação/importação em JSON, arquivo automático de versões anteriores, e criação rápida de dados novos.

#### + Novo (criação rápida)

Dentro da página Dados existe um bloco **"+ Novo"** com quatro tipos de dado à escolha:

- **Trabalhador** — mesmo formulário da Estrutura, disponível também aqui.
- **Equipa** — escolhe a máquina, o nome é sugerido automaticamente.
- **Máquina** — nome/código, secção, fabricante, ano.
- **Registo RNC rápido** — só 4 campos: máquina, mês/ano, OF/trabalhos e RNC. Se já existir um registo dessa máquina nesse mês, os valores são **atualizados** em vez de duplicados; caso contrário cria um registo novo.

Cada tipo tem o seu próprio formulário, que aparece ao escolher o chip correspondente; gravar não sai da página.

#### Exportação/importação

O ficheiro JSON deve guardar tudo:

- secções;
- máquinas;
- equipas (incluindo a máquina associada);
- trabalhadores;
- turnos;
- registos de produção;
- causas de RNC;
- arquivo automático de versões anteriores;
- formações futuras;
- metadados da aplicação.

Isto permite usar a app no telemóvel, exportar o ficheiro e voltar a importar noutro dispositivo. Hoje os dados vivem apenas no armazenamento local do dispositivo (localStorage) — não há servidor.

#### Sincronização com Google Drive (planeado, ainda não implementado)

Ideia para uma fase futura: um botão opcional "Ligar ao Google Drive" que permite enviar/carregar o mesmo ficheiro JSON para uma pasta no Drive, como cópia de segurança e forma de partilhar dados entre dispositivos sem cabo nem exportação manual. Pontos a decidir quando for implementado:

- Exige criar um projeto e um "OAuth Client ID" na Google Cloud Console (fora do código da app).
- A sincronização seria sempre **manual** (botão "Enviar para o Drive" / "Carregar do Drive"), nunca automática — a app continua a funcionar 100% offline por padrão, usando o armazenamento local como fonte de verdade.
- Em modo de testes do Google, o login expira ao fim de 7 dias e é preciso voltar a autenticar; não há limite de quantas vezes isso pode ser repetido.

### 7. Assistente IA

Chat dentro da app que responde **apenas com base nos dados já registados** — nunca inventa valores. Corre inteiramente no dispositivo (sem internet, sem servidor) e tolera erros de escrita através de normalização de texto e distância de Levenshtein.

Exemplos de perguntas que entende: pior/melhor máquina, totais e taxa de RNC por máquina/secção/mês/ano, comparação entre Flexografia e Rotogravura, dados por turno, índice de saúde da produção, estatísticas de trabalhadores (experiência média, nacionalidades) e um resumo dos dados disponíveis.

#### Importação por fotografia (funcionalidade futura)

- importar fotografia de relatório/quadro/gráfico;
- a IA lê OF, RNC, máquinas, equipas, turnos, datas e causas;
- a app mostra uma pré-confirmação;
- o utilizador confirma;
- os dados entram automaticamente no JSON.

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
  "trainingRecords": []
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
  "workerIds": ["OF-001", "OF-002"],
  "jobs": 165,
  "rnc": 9,
  "cause": "Limpeza",
  "notes": "Exemplo de observação"
}
```

## Fórmulas principais

```text
Taxa RNC por 100 OF = (RNC / OF) × 100
```

```text
OF por RNC = OF / RNC
```

## Regras de interpretação

- Taxa RNC/100 OF: quanto menor, melhor.
- OF por RNC: quanto maior, melhor.
- Verde só deve representar 0 RNC.
- Qualquer valor acima de zero requer atenção proporcional.
- Comparações por turno devem ser vistas como sinal estatístico, não como prova de causa. O turno pode refletir muitos fatores: complexidade dos trabalhos, experiência da equipa, disponibilidade de apoio técnico, manutenção, cansaço, urgências ou tipo de cliente.

## Ideia de evolução futura

A aplicação pode evoluir para um sistema de gestão operacional da impressão com:

- produção;
- qualidade;
- manutenção;
- formação;
- desperdício;
- tempos de paragem;
- retrabalho;
- custos;
- reclamações;
- auditorias;
- segurança;
- IA para leitura de fotografias e apoio à análise.

## Estado atual

Versão v3 reconstruída em HTML, CSS e JavaScript puro, sem frameworks nem ferramentas de build.

Já implementado:

1. base de dados local em JSON (localStorage), com arquivo automático de versões anteriores;
2. estrutura robusta, incluindo equipa associada a máquina específica;
3. fichas por entidade (secção, máquina, equipa, trabalhador);
4. registo de produção ligado a secção, máquina, equipa, turno e trabalhadores;
5. exportação/importação de dados em JSON;
6. criação rápida de dados ("+ Novo" em Dados), incluindo registo de RNC rápido com atualização automática por máquina/mês;
7. menu lateral, tema claro/escuro e assistente de IA local que responde com base nos dados registados.

Por implementar: sincronização opcional com Google Drive, e leitura automática de fotografias de relatórios.
