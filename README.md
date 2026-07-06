# RNC Impressão v3

Aplicação web para gestão operacional da área de impressão, pensada para começar simples e evoluir para um mini sistema de produção/qualidade.

A ideia deixou de ser apenas contar RNC. A aplicação passa a ser centrada na **produção**, com as RNC como um dos indicadores principais.

## Ideia central

Separar claramente as entidades:

```text
Secção ≠ Máquina ≠ Equipa ≠ Trabalhador ≠ Registo de produção
```

Isto evita misturar responsabilidades e permite análises mais justas.

Um registo de produção liga tudo:

```text
Mês/Ano → Secção → Máquina → Equipa → Trabalhadores presentes → OF → RNC → Causa → Observações
```

## Módulos da aplicação

### 1. Dashboard

Visão rápida do mês atual e acumulado geral:

- total de OF/trabalhos;
- total de RNC;
- taxa RNC por 100 OF;
- OF por RNC;
- alertas principais.

### 2. Produção

Registo mensal de produção:

- ano;
- mês;
- secção;
- máquina;
- equipa;
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
- trabalhadores.

Máquinas iniciais:

- Flexografia: IF1, IF2, IF3, IF4;
- Rotogravura: IR1, IR3, IR4, IR5.

### 4. Fichas

Cada entidade deve ter uma ficha própria.

#### Ficha da secção

- OF;
- RNC;
- taxa RNC/100 OF;
- OF por RNC;
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
- anos na empresa;
- anos na impressão;
- escolaridade futura;
- idiomas futuros;
- máquinas autorizadas futuras;
- formações futuras;
- competências futuras;
- observações.

Os dados de desempenho do trabalhador são calculados a partir dos registos em que ele esteve presente. A aplicação deve deixar claro que isto não prova responsabilidade individual por uma RNC.

### 5. Estatística

Objetivo: permitir cruzamentos como:

- experiência média em impressão;
- nacionalidades por secção/equipa;
- idade média por equipa;
- equipas com melhor taxa;
- máquinas com mais RNC;
- impacto de experiência/formação na taxa de RNC;
- comparação antes/depois de formação;
- melhores combinações equipa + máquina.

### 6. Dados

Exportação/importação em JSON.

O ficheiro JSON deve guardar tudo:

- secções;
- máquinas;
- equipas;
- trabalhadores;
- registos de produção;
- causas de RNC;
- formações futuras;
- metadados da aplicação.

Isto permite usar a app no telemóvel, exportar o ficheiro e voltar a importar noutro dispositivo.

### 7. IA

Funcionalidade futura:

- importar fotografia de relatório/quadro/gráfico;
- a IA lê OF, RNC, máquinas, equipas, datas e causas;
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

Exemplo de registo de produção:

```json
{
  "year": 2026,
  "month": 5,
  "sectionId": "flexo",
  "machineId": "IF4",
  "teamId": "equipa-a",
  "workerIds": ["trab-001", "trab-002"],
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

Versão v3 reconstruída em HTML, CSS e JavaScript puro.

Prioridade atual:

1. base de dados local em JSON;
2. estrutura robusta;
3. fichas por entidade;
4. registo de produção ligado a secção, máquina, equipa e trabalhadores;
5. exportação/importação de dados.
