# Migração Flutter → Angular — primeira entrega

## Inventário e limites
Referência somente leitura: `../balanca_desktop`. Implementação: este repositório. Nenhum backend ou protocolo novo é definido aqui. Levantamento estático dos fontes e catálogo de testes; equivalência visual ainda exige comparação executada nas três resoluções alvo.

Flutter: `lib/app` contém BalancaApp/AppShell, navegação e usuário de demonstração; `core/theme` define verde #00543c, fundo #f4f5f5, borda #dee2e6 e fonte digital; `core/widgets` possui cards, campos readonly e conexão. `features/pesagem` separa layout por densidade, consulta, edição, preview, diálogos, ações e política manual. Há captura manual com autoria/justificativa e separação entre dados oficiais e edição local. `features/access_control` mantém equipamentos por ID, estado de cancelas, semáforos e inversão. `features/configuracoes` cobre geral, SGV, ambiente, manual, indicadores/modelos, impressão e permissões. `features/cadastros` possui registros, formulários, seleção de transportadora e memória; `features/relatorios` catálogo e filtros; `features/ticket` mapeadores, sessão, rastreabilidade e previews A4/térmico. `core/offline` separa pré-ticket, armazenamento, estação, pesagem local e eventos com dependência/ordem/confirmação; `core/indicators` separa leitura, driver, transporte e capacidades. Existem mocks de operações, cadastros, tickets, equipamentos e configurações. Permissões são por perfil e recurso; não representam autenticação corporativa.

Testes Flutter: widget/layout, atalhos (inclusive ausência de F2), cinco ações, fluxo operacional, filas SGV, cancelas/display, indicadores/configuração/capacidades, política manual, permissões, cadastros, relatórios, tickets e eventos offline. São referência de aceitação, não foram executados para evitar geração de arquivos nesse projeto.

Angular: 20.3, standalone, TypeScript 5.9, RxJS 7.8, FormsModule, CSS por componente, Jasmine/Karma. Rotas lazy de Pesagem e Configurações, guard de saída durante diagnóstico. Serviços existentes: pré-ticket HTTP real, configuração geral em localStorage, catálogo de modelos e indicador com Web Serial. Models existentes preservam retorno corporativo, indicadores e modelos. Pesagem já consulta `/api/v1/pre-tickets`, trata retorno/erros, composição e origem de transferência; preservar esses comportamentos. Configurações já têm formulários e diagnóstico. Assets SVG e DS-Digital já estão em public; nenhuma cópia necessária. CSS contém repetição e dimensões mínimas que dificultam telas menores. Testes existentes cobrem criação, título e origem ENTRADA/SAIDA/EPA. Não há script lint.

## Mapa de equivalência e situação
| Flutter | Angular / destino | Situação nesta etapa |
|---|---|---|
| AppShell / Header | App + contexto da estação | evolução do existente |
| menu lateral | App + Router | Pesagem/Configurações preservados; Cadastros/Relatórios pendentes |
| PesagemPage / PesagemLayout | pages/pesagem/Pesagem + CSS | estrutura existente adaptada |
| OperationLookup / Consultar placa | PreTicketService + Pesagem | integração real preservada |
| composição do veículo | campos e validação de carretas | preservado |
| OperationPreview / dados operação | operation-grid | integrado readonly; manual pendente |
| WeightPanels / indicador | estado normalizado da estação + painel | transporte desacoplado na Pesagem |
| resumo da pesagem | summary-panel | preservado |
| PesagemActionBar | barra inferior | cinco ações, F10, sem F2; ações sem contrato indisponíveis |
| PesagemSidePanel / veículos | right-panel | mock existente; abas SGV pendentes |
| AccessControlPanel/State | futuro access-control | preparado no mapa |
| SettingsState / ConfiguracoesPage | Configuracoes + serviços | existente preservado |
| IndicatorSettings | configuração de indicadores | existente; agente pendente |
| IndicatorModel / capacidades | ModeloIndicadorService | existente; ampliar capacidades conforme Flutter |
| gestão de veículos | futura seção SGV | pendente |
| PrintingSettings | futuro adapter de impressão da estação | pendente, sem impressão browser |
| PermissionState / matriz | futuro estado de permissões | pendente |
| CadastroPanel/Form/Memory | futuras páginas de cadastros | remetentes/destinatários, transportadoras, motoristas, placas, operações, itens/produtos, unidades |
| ReportCatalog / RelatoriosPage | futuras páginas de relatórios | Pesagens e Tickets separados |
| TicketPesagem/Mapper/Preview | futuro domínio e previews de tickets | não confundir ticket com pesagem/acesso |
| OfflineStation / eventos | futuro estado de sincronização | sem persistência offline nova |
| LocalWeighing / fases | futuro agregado de pesagem | abertura/fechamento e confirmação separados |

## Decisões
Manter `pages`, `services`, `models` e guard existentes; adicionar `core/models`, `core/state`, `core/integrations` apenas para os novos limites. Não mover todos os arquivos por estética. Estado de contexto Angular signal, identidade de unidade e estação validada, seleção inicialmente ausente; nenhuma balança fictícia global. Código legado da unidade continua válido para consultar pré-ticket enquanto contrato de seleção e autorização corporativa não existe. Contexto não infere identidade de estação a partir de código de unidade. Troca de estação deve no futuro invalidar rascunhos, assinaturas e cache, com confirmação de edição e autorização do servidor.

Portabilidade direta: cores, tipografia, cards, agrupamentos, tabelas, modais, estados e densidades. Adaptação obrigatória: ChangeNotifier vira estado Angular; lifecycle usa destruição Angular; Serial/TCP/drivers e impressão pertencem ao agente. Indicador visual observa leitura normalizada e não conhece protocolo. Adapter inicial explicitamente não configurado, sem simulação de conexão/peso. Tecnologia HTTP/WebSocket/SignalR fica em aberto.

## Riscos e dependências
- Web Serial já existe no serviço legado e diagnóstico de Configurações. Pesagem deixa de usá-lo; retirar/adaptar diagnóstico é a próxima mudança de integração, preservando formulários e catálogo. Não promover este piloto como arquitetura centralizada pronta enquanto isso persistir.
- Credencial estática preexistente no environment/header deve ser substituída por autenticação/BFF e revogada pela equipe responsável; não criar ou copiar segredos. A integração atual foi preservada para não interromper piloto.
- localStorage legado é global ao navegador, não uma configuração corporativa de estação. Migração exige escolha explícita da estação, versionamento e escopo; não atribuir silenciosamente dados globais a uma estação.
- API corporativa é autoridade; não acrescentar /acessos, Oracle, PL/SQL ou regras corporativas no frontend. Contratos de pesagem/tickets, permissões, diretório de unidades/estações e agente ainda precisam ser acordados.
- Indicador zero conectado continua conectado. Política manual: (habilitada OU desconectado) E permissão de pesagem E permissão manual, com autorização específica da captura. Não liberar botão antes de existir fluxo de autorização.
- Inversão SGV troca associação dos equipamentos, mantém posições e semáforos lógicos; rótulos seguem equipamento. Display sanitiza acentos e percorre direita→esquerda; respeitar movimento reduzido. Carreta ausente exibe '-'.
- Offline web precisa decidir durabilidade, sessão, concorrência entre abas, retenção e recuperação; outbox atômica, idempotência e abertura antes do fechamento são requisitos. Online de rede não prova disponibilidade da Libra ou do agente. Nenhum IndexedDB novo nesta fase.

## Continuação / critérios
1. Validar visualmente contra Flutter em 1920×1080, 1600×900 e 1366×768. Esta entrega é fundação, não equivalência integral.
2. Seleção autorizada unidade/estação, configuração por estação e adapter real do agente; substituir diagnóstico Serial legado.
3. Extrair dados operação/indicador/resumo em componentes, implementar manual com permissões e captura auditável; contratos reais de salvar/pesar antes de ativar ações.
4. SGV: abas/pesquisa, cancelas/semáforos/inversão/display e configuração; mocks identificados e sem comandos físicos.
5. Geral/gestão/impressão, capacidades abertas (IND560, IND570, G10K, 9700), matriz de permissões; depois cadastros, relatórios e previews de tickets.
6. Estratégia offline web após acordo de contratos e autenticação. Acrescentar testes de integração e aceitação por fase.


## Valida??o desta entrega
- npm ci --no-audit --no-fund: conclu?do usando lockfile existente, sem atualiza??o de vers?es solicitada.
- npm run build -- --configuration development: passou.
- npm run build: bloqueado pelos budgets CSS de Configura??es (10,07 kB) e Pesagem (19,67 kB); limite 8 kB. CSS legado j? era extenso e as regras de densidade acrescentam tamanho. N?o elevar budgets para esconder d?vida; consolidar CSS por se??o antes da pr?xima entrega visual.
- Testes Karma/ChromeHeadless: locale pt-BR registrado no spec para corrigir falha de DecimalPipe. Testes novos de sele??o/valida??o de contexto e F6/F2.
- Sem lint configurado. Sem teste visual executado; n?o declarar equival?ncia de resolu??es validada.
- A??es de impress?o/salvar/manual/captura ainda desabilitadas. Apenas F6 est? funcional. Controle de acesso ? espa?o reservado; ve?culos continuam demonstra??o est?tica explicitamente marcada. Usu?rio ainda ? demonstra??o preexistente. N?o existe sele??o de esta??o na UI nesta fase.
- Arquivos criados: este documento; core/models/station.ts; core/state/station-context.ts e spec; core/integrations/station-indicator.ts.
- Arquivos alterados: app.ts/html/css, styles.css, pages/pesagem/pesagem.ts/html/css/spec.ts.

# Fase 2 — comparação antes das alterações
Comparação estática realizada diretamente com pesagem_page.dart, weighing_dialogs.dart, pesagem_edit_service.dart, operation_lookup.dart, ticket_session.dart e access_control_state.dart. Não é validação visual executada do Flutter.

| Funcionalidade Flutter | Existe Angular? | Comportamento equivalente? | Estado inicial | Ação necessária |
|---|---|---|---|---|
| F5 preview | botão | não | AUSENTE | preview local por adapter |
| F6 nova | sim | reset incompleto | PARCIAL | limpar operação, preservar configuração e indicador |
| F10 editar aberta | botão desabilitado | não | AUSENTE | máquina de estados e edição sem captura |
| F11 autorização/justificativa/peso/confirmação | botão desabilitado | não | AUSENTE | mock de autorização e auditoria por captura |
| F12 confirmação | botão desabilitado | não | AUSENTE | mesmo dispatcher para clique/tecla |
| Atalhos no campo | somente F6 | não | PARCIAL | cinco teclas e proteção de modal/repetição |
| Consulta placa | API real | parcial | PARCIAL | modo mock explícito, manual sem resultado, foco e cancelamento tardio |
| Carreta | input/datalist | parcial | PARCIAL | opcional, readonly única, LOV múltiplas |
| Dados operação | readonly e placeholders | não | PARCIAL | rascunho manual e campos oficiais protegidos |
| Indicador | adapter desconectado | não testável | PARCIAL | mock normalizado configurável separado do transporte |
| Resumo | quatro cards | estático | PARCIAL | reagir às capturas; não calcular peso seco corporativo |
| Veículos SGV | lista estática | não | PARCIAL | abas, filtro, contagem, carreta opcional |
| Cancelas/semáforos/display | placeholder | não | AUSENTE | estado por equipamento, inversão e animação |
| Usuário | avatar/texto | menu ausente | PARCIAL | menu e sessão explicitamente simulada |
| Header | título/contexto | status estático | PARCIAL | status/pendências mock identificados |
| Integração agente/impressão física/autenticação real | não | não | BLOQUEADO POR INTEGRAÇÃO | manter portas sem inventar endpoints |

Observação da referência: F12 automático desconectado abre preview de zero, mas não muda a fase nem substitui captura manual. O líquido e seco no fechamento permanecem os valores fornecidos pela operação: não inventar cálculo corporativo. Salvar exige fase aberta e permissão editOpen. Foram encontradas alterações locais anteriores, inclusive angular.json; serão preservadas.

## Fase 2 — resultado funcional e limites
A tela agora separa apresentação (`pesagem.ts/html/css`), máquina de estados (`pesagem-state.ts`), fixtures/equipamentos/autorização simulados (`pesagem-mocks.ts`) e porta de impressão (`PRINT_PORT`). A consulta real continua usando PreTicketService e GET /api/v1/pre-tickets, sem endpoints novos. O seletor deixa explícita a origem da consulta; erros reais nunca aplicam fixtures automaticamente. A operação de captura/edição continua local mesmo quando a consulta usa a Libra. O banner informa esse limite.

Máquina de estados: nova → aberta → fechada somente por confirmação de captura válida. F6 limpa a operação e preserva configuração/permissões/leitura. F10 edita metadados somente em aberta, protege dados oficiais e não captura nem gera ticket. O estado líquido/seco permanece o fornecido pela operação, conforme a referência; não foi inventada fórmula corporativa. Leitura automática positiva/estável do mock permite testar ciclo; a implementação Flutter atual só efetiva captura manual e mantém automático desconectado como preview. Portanto este caminho automático é uma extensão de simulação, não integração física concluída.

| Funcionalidade | Flutter | Angular | Situação final |
|---|---|---|---|
| Nova Pesagem / F6 | OK | OK em memória | OK — reset e preservação de configuração testados |
| Salvar / F10 | OK | OK em memória | OK — fase aberta, sem captura/ticket, correção oficial rejeitada |
| Política manual / F11 | OK | OK em mock | OK — comunicação independente de peso zero, permissões revalidadas |
| Autorização, justificativa, entrada e confirmação manual | mock local | mock isolado | OK no fluxo local — demo/demo explicitamente exibido, autoria por captura |
| F12 desconectado | preview sem captura | preview sem captura | OK — não avança estado nem substitui captura válida |
| Captura automática | driver desconectado nesta tela | leitura normalizada simulada | PARCIAL — fluxo mock funcional, depende de agente para captura real |
| Atalhos com campo focado | OK | OK | OK — cinco teclas, sem F2, bloqueio de repetição/modal |
| Consulta placa/Enter/limpeza | fixtures locais | fixtures + API existente | OK nos casos testados; Tab consulta placa válida |
| Composição | carreta opcional, única readonly, múltiplas LOV | mesmas regras | OK nos casos testados |
| Dados integrados/manuais | oficial readonly e rascunho | oficial protegido e manual editável conforme permissão | OK nos campos solicitados; Operador vem da sessão demo |
| Resumo | captura atualiza primeiro/segundo; líquido/seco externos | mesmo conceito | OK no ciclo local; cálculo corporativo depende de contrato |
| Veículos/SGV | abas, busca, carreta opcional | abas, busca, contagem e '-' | OK no comportamento local; catálogo de fixtures reduzido |
| Cancelas/semáforos/inversão | configuração + estados por ID | dois equipamentos simulados e posições fixas | PARCIAL — estados, comandos locais e inversão testados; catálogo/configuração da estação ainda não integrado |
| Display | preto/vermelho/digital, saneamento e movimento | mesmas regras, respeita movimento reduzido | OK para comportamento local; QA visual comparativo ainda pendente |
| Impressão F5 | ticket térmico/A4 com rastreabilidade | preview textual por porta | PARCIAL — tem função testável; ainda não replica layouts e todos os modelos de ticket |
| Menu usuário | ações simuladas | menu customizado, troca e logout local | PARCIAL — fluxo local pronto, diretório/matriz corporativa e acessibilidade completa do menu pendentes |
| Header | status da estação e pendências locais | status/pendências explicitamente mock | PARCIAL — não acompanha outbox real |
| Persistência offline/agente/impressão física/autenticação corporativa | arquitetura desktop/mocks | portas sem serviço real | BLOQUEADO POR INTEGRAÇÃO — não foram inventados endpoints |

### Como testar manualmente
1. Acessar Pesagem: o modo inicial é Mock local. Consultar ABC1D23 (LOV duas carretas), DEF2E34 (operação aberta com Peso1 28450), GHI3F45 (carreta única) ou ZZZ9Z99 (manual sem operação inventada).
2. F11: demo/demo + justificativa, peso positivo, confirmação. F10 deve habilitar em aberta; alterar Observação e salvar não altera Peso1. Repetir manual para fechar; F10 desabilita.
3. F5 abre preview local sem impressão física. F6 limpa os dados, preserva controles de simulação. F12 desconectado abre preview sem captura. Em Controles de simulação, conectar/estabilizar e informar peso para testar automático; zero conectado não libera contingência manual.
4. Alternar SGV, pesquisar placa/carreta e inverter associação das cancelas. Abrir uma cancela antes de inverter permite verificar que o estado fica no equipamento. Semáforos são posições lógicas independentes. Texto COOXUPÉ BALANÇA aparece COOXUPE BALANCA.
5. Para consultar a API de verdade, escolher Libra-API real e configurar unidade/contexto. Nenhuma resposta/erro real é substituído silenciosamente por fixture.

### Arquivos desta fase
Novos: pages/pesagem/pesagem-state.ts, pesagem-state.spec.ts, pesagem-mocks.ts; core/state/demo-session.ts.
Alterados: pages/pesagem/pesagem.ts/html/css/spec.ts; app.ts/html/css/spec.ts; este documento. Alterações anteriores de angular.json foram preservadas.

### Continuação
Priorizar ainda a Pesagem: integrar configuração SGV/perfis à estação, completar preview térmico/A4 e rastreabilidade de tickets, validar layout nas três resoluções contra Flutter executado e fortalecer foco/acessibilidade dos menus. Só depois avançar outras telas. Não há equivalência integral declarada. Mock local é volátil e não equivale à estratégia offline durável.


### Valida??o final da fase 2
- npm test -- --watch=false --browsers=ChromeHeadless: 37 testes passaram, incluindo su?te original e novos cen?rios de estados, cinco atalhos, consulta real/cancelamento, carreta, dados edit?veis/readonly, resumo, ve?culos, controle de acesso, invers?o, display e menu demo.
- npm run build -- --configuration development: passou.
- npm run build: templates/TypeScript compilam, mas produ??o ? bloqueada exclusivamente pelo budget CSS preexistente de Configura??es (10,07 kB contra limite 8 kB). Pesagem caiu de 19,67 kB para 5,61 kB; permanece aviso acima de 4 kB, sem erro de budget. N?o foram alterados budgets nem CSS de outras telas.
- Sem script lint no package.json. git diff --check executado; arquivo de teste normalizado para remover linha vazia excedente.
- Flutter permaneceu sem altera??es no git status. Nenhum commit/push; sem altera??es em Libra ou diret?rios irm?os.
- N?o executada compara??o visual lado a lado; testes DOM n?o comprovam fidelidade visual ou acessibilidade completa.

# Fase 3 — comparação de Configurações antes de alterar código
Leitura da referência: settings_models.dart, settings_mock_data.dart, configuracoes_page.dart, printing_settings.dart, permission_models.dart e indicator_models.dart. Angular: Configuracoes, serviços/modelos legados, guard e estado da Pesagem.

| Funcionalidade | Flutter | Angular antes | Situação | Diferença / ação |
|---|---|---|---|---|
| Seis abas | gerais/gestão/impressão/indicadores/modelos/permissões | gerais/indicador/modelos | PARCIAL | completar abas, controle por recurso e SGV |
| Gerais | unidade LOV, SGV, ambiente, manual | código numérico da unidade | PARCIAL | diretório mock e contexto unidade/estação |
| Gestão | cancelas, associação, inversão, semáforos, display, OCR, voz | controles locais só na Pesagem | AUSENTE | store central, validação e publicação após salvar |
| Indicadores | instalações múltiplas e capacidades por modelo | um indicador com Web Serial no diagnóstico | PARCIAL | retirar diagnóstico de hardware do fluxo e usar gateway mock |
| Modelos | catálogo extensível/capacidades | catálogo extensível com defaults fixos | PARCIAL | preservar catálogo legado e ampliar capacidades sem forçar defaults |
| Impressão | impressoras mock, papel por impressora, logo, ticket/A4 | somente preview textual na Pesagem | AUSENTE | modelo/porta/preview reutilizável |
| Permissões | perfis 0–4, matriz e diretório mock | booleans por componente | AUSENTE | autorização central e matriz parametrizável |
| Configuração na Pesagem | estado compartilhado | mocks independentes | AUSENTE | vincular controles ao estado por estação |
| Serviço físico/AD/spooler | contratos/estado desktop e mocks | sem contrato corporativo de estação | BLOQUEADO POR INTEGRAÇÃO | portas substituíveis, nenhum endpoint inventado |
| Build produção | não aplicável | bloqueado por CSS Configurações >8 kB | PARCIAL | consolidar estilos desta tela sem elevar budget |

A configuração existente em localStorage não tem identidade de estação. Não será atribuída silenciosamente a todas as estações: preservar arquivos/dados legados e oferecer importação explícita de catálogo, mantendo configuração nova em repositório de memória por identidade composta de unidade/estação. OCR token é transitório de sessão, não senha ou segredo persistido. Ambiente não troca endpoint.

## Fase 3 — resultado atual (substitui as pendências correspondentes das fases anteriores)

### IMPLEMENTADO NO ANGULAR
- Seis abas com controle central de acesso por recurso; Gestão de Veículos condicionada ao SGV.
- LOV mock de unidades e estações, incluindo duas estações na mesma unidade. Estado configurável indexado por identidade composta, sem copiar configuração entre estações. Repositório de memória substituível (`SettingsRepository`). Sem nova persistência remota ou local definitiva.
- Gerais: SGV, ambiente e manual. Ambiente é somente preferência local e não modifica a Libra-API. Contexto selecionado alimenta o header e o código da unidade usado na consulta real.
- Gestão: seleção independente de equipamentos; mesma cancela rejeitada na seleção e no save; inversão troca IDs e mantém as posições Entrada/Saída. Cancelas/semáforos/display somem conforme configuração publicada. Semáforo vertical com vermelho em cima e verde embaixo, derivado do estado lógico da cancela; estados por equipamento, sem trocar os widgets de posição.
- Display: mensagem até 40 caracteres, validação de texto compatível, função única sanitizeDisplayText, fonte digital vermelha/fundo escuro, recorte e movimento direita→esquerda. Publicação no save sem reiniciar. Movimento reduzido respeitado.
- OCR: endereço/porta/token mascarado de sessão, validação de porta; voz como preferência. Sem chamadas a equipamentos ou engine.
- Indicadores: múltiplas instalações, nome/modelo/ativo, Serial ou TCP, protocolo/capacidades por modelo, validação de IPv4/porta/timeout/reconexão e Serial. Trocar modelo limpa parâmetros incompatíveis; salvar não força 4800,E,7,2. Modelos IND560/G10K/9700 ficam sem capacidades confirmadas como na referência. Modelos novos/editáveis e importação explícita de catálogo legado.
- Diagnóstico: IndicatorGatewayService/IndicatorGatewayPort mock, resultados Conectado, Comunicação estabelecida, Sem dados, Timeout, Host inacessível e Erro. Cancelamento ao sair/trocar aba/contexto. Nenhuma leitura de diagnóstico alimenta a Pesagem.
- Impressão: catálogo mock de impressoras com status/conexão/tipo; papel/origem/orientação por impressora, fallback A4, entrada/saída/cópias/cabeçalho/rodapé/logo e previews compartilhados. Quantidade 1–10 e papel/origem compatíveis validados. Troca/restauração de logo usam opções demonstrativas, como Flutter. PrintGatewayService/PrintGatewayPort não chamam spooler.
- Permissões: perfis 0 Master, 1 Administrador, 2 Supervisor de Balança, 3 Líder de Operação, 4 Operador; defaults seguem permission_models.dart. Matriz editável por manageProfiles, Master imutável/total, atribuição de perfil controlada por assignProfile e diretório pesquisável por readUsers. Inclui Pesagem, manual, autorização, editar aberta, tolerância, reprocessamento, cancelar operação/ticket, imprimir/reimprimir, cadastros, relatórios, configurações, usuários/perfis. As permissões de telas ainda não migradas são conceitos preparados, não fluxos novos dessas telas. Cancelar ticket permanece conceito lógico, nunca exclusão.
- Sessão demo usa usuário do diretório/perfil real da matriz mock, sem senha armazenada. Autorizador manual é verificado separadamente do operador corrente e revalidado na confirmação.
- Pesagem recebe configurações e permissões compartilhadas; removidos os controles independentes de configuração/perfil da tela. Controles de leitura mock permanecem explícitos. Indicadores todos inativos resultam em desconectado; o transporte continua abstraído por leitura normalizada. Estado de comunicação é normalizado, incluindo desconectado/conectando/conectado/sem comunicação/erro.
- A operação em memória é preservada ao visitar Configurações e retornar na mesma estação. Troca de estação cancela consulta/modal e inicia operação limpa. Isso não equivale a armazenamento durável de pesagens abertas em todas as unidades.

### Checklist final de equivalência
| Funcionalidade | Flutter | Angular | Equivalência | Mock / pendência de serviço local |
|---|---|---|---|---|
| Gerais, unidade e estação | unidade local, SGV/ambiente/manual | seleção por contexto + opções reativas | IMPLEMENTADO NO ANGULAR | diretório mock; autorização corporativa de estação futura |
| Aba Gestão condicionada ao SGV | sim | sim | OK em sessão | nenhuma dependência física para a regra |
| Cancelas, associação e inversão | estado por equipamento | estado por ID e posições fixas | OK nos cenários testados | simulação; comando físico depende de agente |
| Semáforos | vertical/estado lógico | vertical/estado lógico | OK nos cenários testados | sem telemetria real |
| Display configurável/sanitização | sim | sim, função compartilhada | OK nos cenários testados | texto e animação locais |
| OCR/voz | configuração/mock | configuração/validação | IMPLEMENTADO NO ANGULAR | PREPARADO PARA INTEGRAÇÃO REAL |
| Indicadores Serial/TCP | instalação/capacidades | instalação/capacidades/validação | IMPLEMENTADO NO ANGULAR para campos desta rodada | campos avançados de canal/interface física/DHCP do Flutter ainda não expostos; confirmar necessidade na próxima etapa |
| Modelos | catálogo aberto; IND570 documentado | catálogo aberto + importação legada | OK no conceito/capacidades solicitadas | demais modelos aguardam documentação |
| Testar conexão | driver/estado separado | gateway mock separado | OK no fluxo mock | PREPARADO PARA INTEGRAÇÃO REAL |
| Preferências de impressão | papel por impressora, logo, cópias etc. | mesmos conceitos/validação | IMPLEMENTADO NO ANGULAR | status/descoberta simulados, sem spooler |
| Ticket/A4 | layouts e rastreabilidade completos | previews distintos e compartilhados com dados/autor/instante/resumo | PARCIAL | faltam reprodução gráfica integral, código de barras e identificadores oficiais de ticket; não gerar ticket oficial fictício |
| Perfis/matriz/atribuição | defaults e diretório mock | defaults e diretório mock | OK nos cenários testados | AD e enforcement corporativo dependem de backend |
| Configuração reflete na Pesagem | estado compartilhado | store/serviço compartilhado | OK nos cenários testados | sem backend necessário para regras locais |

### PREPARADO PARA INTEGRAÇÃO REAL
Adapters/tokens para SettingsRepository, IndicatorGatewayPort, StationIndicatorPort e PrintGatewayPort; nenhum endpoint, banco, protocolo ou transporte físico inventado. O serviço Web Serial antigo permanece como arquivo legado sem consumidores no fluxo atual (não foi reativado nem usado pelos testes); a nova Configurações não o importa. Remoção definitiva pode ser feita após revisão do histórico de integrações legadas. Dados antigos de indicador/modelos não foram apagados: importação explícita copia para rascunho/catálogo da sessão e exige revisão/salvar na estação selecionada. Token OCR é transitório de memória e não é enviado nem gravado em storage; credenciais corporativas devem ficar no serviço apropriado.

### Arquivos desta rodada
Novos: core/models/station-settings.ts; core/state/permission.service.ts, indicator-catalog.ts, station-settings.service.ts; core/integrations/indicator-gateway.ts, print-gateway.ts, legacy-indicator-import.ts; shared/components/print-preview.ts; pages/configuracoes/configuracoes.spec.ts.
Alterados: pages/configuracoes/configuracoes.ts/html/css; pages/pesagem/pesagem.ts/html/css, pesagem-mocks.ts, pesagem-state.ts e pesagem.spec.ts; core/models/station.ts; core/state/demo-session.ts; app.html/spec.ts; este documento. Alterações anteriores de outros arquivos do Angular permaneceram preservadas; nenhum arquivo Flutter ou de outro repositório foi alterado.

### Validação e continuação
Build de produção (`npm run build`) passou após consolidar o CSS de Configurações. Não houve aumento de budget. Permanece aviso de CSS Pesagem acima de 4 kB, abaixo do limite de erro de 8 kB. Sem lint configurado.
Testes verificam integração de save com Pesagem, isolamento entre estações, estados/manual/permissões, validações Serial/TCP/OCR, diagnóstico isolado/cancelável, papel/previews e importação legada não destrutiva. Testes DOM cobrem larguras de conteúdo correspondentes a 1920,1600,1366; não substituem inspeção visual lado a lado nas alturas 1080/900/768.
Próximo passo: revisão visual comparativa, fidelidade dos layouts de ticket/A4 e rastreabilidade; acordar contratos do agente, identidade corporativa e configuração central. Nenhuma impressão automática/física, OCR, voz, COM ou socket do navegador foi acionado. Preferências de emissão entrada/saída ficam disponíveis na configuração; não inventam emissão de ticket oficial.

Resultado final desta rodada: 56 testes passaram em ChromeHeadless (`npm test -- --watch=false --browsers=ChromeHeadless`); build de produção passou (`npm run build`); sem script lint. git diff --check passou. Sem commit/push. Os testes de sessão também confirmam preservação da pesagem aberta ao visitar Configurações e retornar.

# Rodada final — inventário antes das alterações
Comparação estática com cadastro_record/form/cadastros_memory, report_catalog/relatorios_page e ticket_pesagem/mapper/traceability/sections. Cadastros Flutter tem CRUD local nas quatro primeiras abas; Operações/Itens/Unidades são placeholders. Relatórios Flutter tem catálogo/filtros e ações desabilitadas aguardando camada de dados. Tickets têm modelo separado de pesagem, layouts e rastreabilidade de preview. Angular ainda não possui rotas de Cadastros/Relatórios/Tickets e os dois primeiros menus estão desabilitados por etapa futura; possui print preview e gateway substituível. Esta rodada implementará CRUD mock e resultados de relatórios explicitamente simulados, sem alegar endpoints ou validação corporativa. Ticket cancelado preservará histórico, usuário e motivo. Dados ausentes continuarão nulos. A revisão final distinguirá equivalência local, integrações pendentes e fidelidade visual parcial.

# Resultado consolidado da migração — avaliação manual
Este quadro representa o estado atual e substitui as pendências históricas correspondentes acima. EQUIVALENTE significa equivalência do comportamento local descrito e testado, não integração corporativa/física ou identidade visual pixel a pixel. A referência Flutter foi inspecionada somente por leitura de fontes/testes; não foi compilada, executada ou alterada. O Angular foi compilado e executado em Chrome headless de produção.

| Área | Flutter | Angular | Situação | Observação |
|---|---|---|---|---|
| Header | contexto, sessão e estado offline local | contexto reativo, diretório/perfil mock, status/pendências mock | PARCIAL | sincronização/outbox não implementadas |
| Menu | quatro áreas principais | cinco rotas, incluindo Tickets, permissão por recurso | EQUIVALENTE | navegação/retorno e guard de formulário testados |
| Pesagem | ciclo local e confirmações | nova/aberta/fechada, sessão mantida ao navegar | EQUIVALENTE | ciclo local; sem gravação corporativa |
| Consultar placa | lookup mock e proteção de resultados tardios | lookup mock explícito + pré-ticket real preservado | EQUIVALENTE | Enter/Tab, readonly, limpeza, cancelamento de consulta |
| Composição | carreta opcional, única readonly e LOV múltipla | mesmas regras | EQUIVALENTE | sem obrigatoriedade universal de carreta |
| Dados da Operação | oficiais readonly, edição manual | mesmos campos/rascunho/permissões | EQUIVALENTE | label Transportadora; salvar não captura |
| Indicador visual | leitura normalizada/driver desacoplado | leitura normalizada/port/mock | EQUIVALENTE | telemetria física depende de agente |
| Resumo | primeira/segunda captura; líquido/seco fornecidos | reativo às capturas; não inventa apuração | EQUIVALENTE | no ticket, valores ainda sem origem ficam nulos |
| Barra de ações | F5/F6/F10/F11/F12 sem F2 | mesmas ações para clique/tecla | EQUIVALENTE | modal/repetição protegidos; F10 só aberta |
| Peso Manual | autorização, motivo, peso, confirmação | mock demo/demo + autorização central por leitura | EQUIVALENTE | não é autenticação de produção |
| Veículos | SGV com pátio/operação e pesquisa | abas/contagem/pesquisa/carretas opcionais | EQUIVALENTE | catálogo simulado |
| Controle de acesso | estado por equipamento e inversão | estado por ID, posições lógicas fixas, semáforos/display | EQUIVALENTE | comandos somente mock; movimento reduzido respeitado |
| Configurações Gerais | unidade, SGV, ambiente, manual | contexto multiestação + store por identidade composta | EQUIVALENTE | ambiente não troca endpoint |
| Gestão de Veículos | cancelas/semáforo/display/OCR/voz | configurações publicadas para Pesagem | EQUIVALENTE | OCR/voz preservados como configuração |
| Impressão | preferências, logos, Ticket/A4 | preferências e previews compartilhados | PARCIAL | apresentação adaptada para HTML; ainda requer homologação de papel e layout físico |
| Indicadores configuráveis | instalações, capacidades, diagnóstico | Serial/TCP, validações, gateway de diagnóstico | PARCIAL | campos avançados de canal/interface/DHCP ainda não expostos |
| Modelos de Indicadores | catálogo aberto; IND570 documentado | catálogo aberto, capacidades e importação legada | EQUIVALENTE | IND560/G10K/9700 aguardam documentação como no Flutter |
| Permissões | perfis 0–4, matriz, diretório mock | mesmos defaults, matriz/atribuição central e ações protegidas | EQUIVALENTE | enforcement corporativo depende de identidade/backend |
| Cadastros (quatro principais) | CRUD em memória | listar/pesquisar/incluir/editar/visualizar/inativar | EQUIVALENTE | Angular preserva inativos; não faz exclusão física |
| Operações / Itens / Unidades | placeholders | código/descrição/observação locais, aviso provisório | EQUIVALENTE | estrutura mock mínima; nenhuma regra corporativa inventada |
| Relatório de Pesagens | catálogo/filtros, camada de dados pendente | todos os filtros + resultados mock/sessão | EQUIVALENTE | ações de gerar/preview/CSV funcionais como extensão solicitada |
| Relatório de Tickets | catálogo separado | filtros próprios e resultados separados com relação 1:N | EQUIVALENTE | cancelamento aparece ao gerar novamente |
| Demais Relatórios | sete definições adicionais | nove relatórios no total, fontes mock/cadastros locais | EQUIVALENTE | cadastro vazio produz resultado vazio explicado |
| Tickets | modelo, mapping e previews | modelo nullable, Ticket/A4/Code39, emissão mock, reimpressão/cancelamento auditados | PARCIAL | fluxo local completo para avaliação; layout fiscal/numeração oficial/rastreabilidade corporativa pendentes |
| Serviços corporativos | abstrações e código desktop | pré-ticket piloto e portas sem novos endpoints | BLOQUEADO POR INTEGRAÇÃO | contratos adicionais precisam ser definidos pela Libra-API |
| Hardware | drivers/transportes desktop | gateways substituíveis, sem COM/socket/spooler | BLOQUEADO POR INTEGRAÇÃO | depende do serviço da estação |
| Offline definitivo | eventos locais, ordem/idempotência | estados de UI/portas preservados | PENDENTE | avaliar IndexedDB, service worker/PWA/agente e sincronização; nenhuma escolha definitiva |

## Implementado nesta rodada
Cadastros com sete abas, campos de pessoas/endereço/documentos/vínculo/transportadora e placa Cavalo/Carreta. Validações seguem os campos obrigatórios do Flutter: nome, tipo, vínculo, transportadora cadastrada quando aplicável e placa brasileira. Sem validação fiscal/ERP inventada. Inativação local preserva registro e relações, sem cascata. Formulário não salvo exige confirmação antes de sair da rota.

Relatórios de Pesagens e Tickets separados; filtros de período/placa/carreta/motorista/transportadora/remetente/item/unidade/operação/documento/status/manual/divergência/operador e filtros específicos de ticket. Resultados mock e sessão, período inclusivo, datas invertidas rejeitadas, preview de impressão sem spooler e CSV local com proteção básica contra fórmulas. Filtros/resultados isolados por estação. Relatórios de cadastros leem a fonte local com permissão de relatórios, independente da permissão de editar cadastros.

Ticket com campos nullable, snapshot de dados, peso/captura/autorizador/justificativa e IDs distintos de pesagem/ticket. `MOCK-*` identifica exclusivamente números locais de teste. Emitir ticket mock é ação explícita com permissão e captura confirmada; nunca ocorre ao Salvar Pesagem. Vários tickets podem apontar à mesma pesagem. Reimpressão adiciona evento sem criar outro ticket. Cancelamento exige permissão/motivo e preserva dados, usuário, data e histórico; ticket cancelado pode ser visualizado/reimpresso com marca CANCELADO. Não existe exclusão de ticket. Code 39 foi portado como algoritmo puro da referência, sem biblioteca/driver.

Gaps corrigidos: menus por etapa futura sem função; ausência das três rotas; CRUD/filtros/histórico ausentes; valores desconhecidos no ticket; resultados de relatório sem escopo; texto corrompido em mensagens legadas; idioma HTML; ações da Pesagem fora da viewport compacta; logo branco invisível sobre papel. O serviço Web Serial legado, sem consumidores e substituído pelos gateways, foi removido. Nenhuma dependência ou versão Angular foi alterada.

## Mockado
Cadastros e relatórios; diretórios de unidades/estações/usuários/perfis; operação de pesagem/captura; indicador/controladores; emissão/reimpressão/cancelamento de tickets; status de impressoras; OCR/voz e conexão da estação. Dados são voláteis de sessão e não têm validade fiscal. Cadastros são corporativos de demonstração; configurações/histórico de tickets são indexados pela unidade/estação. A arquitetura permite novos diretórios e múltiplas estações por unidade, sem assumir uma balança global única.

## Dependente de Libra-API
A chamada existente GET /api/v1/pre-tickets permanece a fonte real do piloto, escolhida explicitamente no seletor da Pesagem. Não foi inventado /acessos. CRUD, pesagens/tickets oficiais, relatórios corporativos, identidade, numeração, tolerâncias e apuração dependem de contratos reais. Nenhum Oracle/PLSQL/regra corporativa foi colocado no frontend. A credencial estática preexistente do piloto deve ser tratada antes de produção; não foi ampliada nem usada no modo mock.

## Dependente do serviço da estação
Indicador/Serial/TCP, impressão física, cancelas/semáforos/display, OCR e demais dispositivos permanecem atrás de interfaces. Sem abertura COM, socket bruto ou spooler no navegador. A busca estática e os bundles finais não contêm requestPort/getPorts/navigator.serial. Diagnóstico não altera a leitura operacional.

## Pendente futuro (não bloqueia avaliação mock)
Homologação gráfica/fiscal dos tickets e leitor de barcode; capacidades avançadas/canais de modelos; contratos corporativos e agente; AD/autenticação de produção; armazenamento durável/concorrência/outbox/idempotência offline; catálogo oficial de cadastros/unidades e consulta agregada corporativa. A matriz final não declara equivalência pixel a pixel nem prontidão para produção.

## Arquivos desta rodada
Novos: core/models/registry.ts, reports.ts, ticket.ts; core/state/registry.service.ts, report.service.ts, ticket.service.ts, final-migration.spec.ts; pages/cadastros/cadastros.ts/html; pages/relatorios/relatorios.ts/html; pages/tickets/tickets.ts/html; shared/styles/workbench.css; shared/components/ticket-document.ts; scripts/manual-review.mjs; docs/avaliacao-manual.md; docs/qa-final com JSON e capturas.
Alterados: app.ts/html/css/routes.ts; core/integrations/print-gateway.ts e station-indicator.ts; core/state/station-context.ts; shared/components/print-preview.ts; pages/pesagem/pesagem-state.ts/css; pages/configuracoes/configuracoes.css; index.html; .gitignore; este documento. Removido: services/indicador-peso.service.ts, antigo acesso Web Serial sem consumidores. Demais alterações já presentes nas rodadas anteriores foram preservadas; nenhum commit/push.

## Validação final
- `npm run build`: produção passou; único aviso é CSS da Pesagem 7,16 kB acima do aviso de 4 kB e abaixo do limite de erro de 8 kB. Budget não foi aumentado.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 68 testes passaram, incluindo os 56 anteriores, novos cadastros/relatórios/tickets, permissões, navegação lazy/guard e preservação da pesagem.
- `node scripts/manual-review.mjs`: build de produção servido estaticamente (não é backend/API); 15 capturas, cinco rotas em 1920×1080, 1600×900 e 1366×768, zero erros de runtime capturados, sem overflow horizontal e barra de ações dentro da viewport nas três resoluções. Mais oito verificações de fluxo por DOM/eventos no Chrome: captura manual/fechamento/F10, emissão mock/Code39, cancelamento, reimpressão marcada, CRUD de Transportadora e os dois relatórios separados. Evidência em docs/qa-final/runtime.json e PNGs, inclusive preview cancelado.
- Capturas inspecionadas visualmente; o primeiro teste identificou ações fora da viewport compacta e a densidade foi corrigida antes da aprovação. Formulários e relatórios extensos mantêm scroll vertical normal.
- `git diff --check`: passou. Sem script lint no package.json. Flutter permaneceu sem alterações. Sem commit/push; nenhum repositório irmão foi modificado.

PRONTO PARA AVALIAÇÃO MANUAL (modo mock, sem integrações físicas/corporativas adicionais).

# Rodada exclusiva de fidelidade visual
Apresentação revisada a partir das capturas existentes e dos fontes atuais do Flutter. Relatório detalhado: [fidelidade-visual.md](fidelidade-visual.md). Evidências: qa-visual (antes: qa-final). Restaurados ícones/identidade da barra, agrupamentos e proporções dos campos, indicador, resumo, menu/header, cancelas/semáforos/display e polimento das demais telas. Regras, serviços, mocks, APIs, permissões e fluxos não foram alterados; componentes novos são somente de apresentação. Build e 72 testes passaram; validação em três resoluções com zero erros de runtime. Sem commit/push.

## Rodada de correções — contexto, Configurações, Controle de Acesso e navegação

Relatório detalhado: [correcoes-contexto-navegacao.md](correcoes-contexto-navegacao.md). Evidências desta rodada: [qa-correcoes/runtime.json](qa-correcoes/runtime.json).

| Área | Referência Flutter | Angular nesta rodada | Situação |
|---|---|---|---|
| Unidade / estação | Desktop configura unidade; estação é adaptação necessária ao web centralizado | Seleção válida ativa contexto compartilhado sem depender de “Aplicar”; opção única automática; configuração isolada por estação | IMPLEMENTADO NO ANGULAR; diretório mock |
| LOVs / formulários | Campos proporcionais e agrupados | Tamanhos reutilizáveis 140 / 220 / 300 px e largura total explícita, com quebra natural | IMPLEMENTADO NO ANGULAR |
| SGV | Controle de Acesso disponível com mensagem quando nenhum equipamento está habilitado | Painel depende somente de SGV; dispositivos independentes | IMPLEMENTADO NO ANGULAR |
| Cancelas / semáforos | Cena 100 × 70, haste 50, pivô no motor, saída espelhada, semáforo vertical | Geometria preservada; luz junto ao motor; recorte e testes dos ângulos fechado/intermediário/aberto | IMPLEMENTADO NO ANGULAR; estados mock; hardware depende do serviço da estação |
| Display | DS-Digital, vermelho, fundo escuro, mensagem sanitizada, duração conforme comprimento | Fonte existente reutilizada; percurso completo mesmo com texto longo; atualização após salvar sem reload | IMPLEMENTADO NO ANGULAR; equipamento físico depende do serviço da estação |
| Inversão | Troca associação sem trocar posições | Mantida e testada; IDs exclusivos | IMPLEMENTADO NO ANGULAR; equipamento mock |
| Cadastros / Relatórios | Consulta protegida por permissões; menu inerte sem permissão | Menu abre a área e informa acesso restrito quando necessário. Dados e ações continuam protegidos | IMPLEMENTADO NO ANGULAR; diferença de navegação intencional solicitada nesta rodada |
| Abas | Sete cadastros e nove relatórios previstos | Todas verificadas com cliques e conteúdo/filtros | IMPLEMENTADO NO ANGULAR; dados mock |
| Menu / ícone Pesagem | Identidade e proporção dos ícones | Container compartilhado, compensação de escala 1,25 no SVG horizontal da balança, sem alterar desenho | IMPLEMENTADO NO ANGULAR |

Validação final desta rodada:

- `npm test -- --watch=false --browsers=ChromeHeadless`: **84 testes passaram**, incluindo 12 novos testes de regressão desta rodada.
- `npm run build`: **produção passou**. Quatro avisos de CSS: App 4,31 kB, Configurações 5,51 kB, workbench 4,73 kB e Pesagem 7,46 kB. Limites não foram aumentados; nenhum erro de build.
- `QA_OUTPUT=docs/qa-correcoes node scripts/manual-review.mjs` (variável definida em PowerShell): **15 capturas das rotas nas três resoluções, mais três capturas complementares; 38 verificações; zero erros de runtime capturados**. Cliques de ponteiro com detecção de overlay, todas as abas, seleção/retorno entre estações, SGV/dispositivos, fonte digital carregada, captura manual, ticket/cancelamento/reimpressão, CRUD e relatórios.
- Sem overflow horizontal nas cinco rotas em 1920×1080, 1600×900 e 1366×768. A barra de ações da Pesagem permanece dentro da viewport nas três.
- Sem script de lint no `package.json`.

Preservados: regras de Pesagem/Peso Manual, atalhos, indicadores, permissões, tickets, fonte operacional `GET /api/v1/pre-tickets` e separação entre Angular, Libra-API e serviço da estação. Nenhum endpoint novo, acesso a hardware ou alteração fora do `balanca-web`; sem commit/push. Persistência remota e equipamentos reais continuam pendências de integração, não impedimentos para testar a interface com mocks.
