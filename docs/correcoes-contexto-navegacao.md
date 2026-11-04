# Correções de contexto, Configurações e Controle de Acesso

Referência: código atual de `balanca_desktop`, consultado somente para leitura, especialmente `app_shell.dart`, `configuracoes_page.dart` e `access_control_panel.dart`. Alterações limitadas ao `balanca-web`, sem commit, push, backend ou acesso a hardware.

## Diagnóstico e correções

| Item | Causa anterior | Correção / verificação |
|---|---|---|
| Unidade / estação | Os selects alteravam `unitId` e `stationId` locais. Somente “Aplicar contexto” publicava no `StationContext`; salvar antes disso falhava. | Mudanças de seleção publicam automaticamente um par válido. IDs são validados em conjunto, estação deve estar ativa e pertencer à unidade. |
| Troca de unidade | O contexto anterior podia continuar ativo enquanto o formulário mostrava outra unidade. | Seleção pendente limpa o contexto anterior; salvar sem estação válida continua impedido para evitar gravação no escopo errado. O efeito de atualização preserva a unidade pendente. |
| Opção única | Não havia autosseleção. | Unidade única válida e estação única são selecionadas automaticamente. Diretório mock injetável por `STATION_DIRECTORY`, sem IDs hardcoded no componente. |
| Configuração por estação | Repositório em memória e chave unidade/estação já existiam. | Mantidos. Trocar de estação carrega seu estado; retornar recupera sua configuração. Header, Pesagem e equipamentos continuam usando o mesmo contexto. |
| LOVs | Grid com colunas `1fr` expandia controles pequenos até metade do painel. | Campos `field-sm` (140 px), `field-md` (220 px), `field-lg` (300 px) e `field-full`, com limite na largura disponível e quebra responsiva. O controle ocupa apenas a largura do seu campo. |
| SGV | Painel condicionado a SGV **e** algum equipamento habilitado. | SGV controla o painel. Sem equipamentos, exibe “Nenhum componente visual habilitado.”, como o Flutter. Cancelas, semáforos e display são independentes. |
| Cancelas | A geometria principal do Flutter já existia. | Mantidos cena 100 × 70 px, haste 50 px, pivô junto ao motor e espelhamento da Saída. Cena recortada, altura reservada e teste dos três ângulos evitam sobreposição. |
| Semáforos | Havia distância visual excessiva até o motor; altura não incluía as margens verticais do Flutter. | Distância de 4 px do motor, corpo vertical de 36 px, vermelho acima de verde, fora do percurso da haste. Quando usados sem cancelas, ficam centralizados em cada posição. |
| Display | Fonte digital já disponível. Texto longo podia reiniciar antes de sair completamente, pois o bloco tinha a largura do painel. | Componente apenas visual `InformationDisplayComponent`, largura do texto medida pelo CSS (`max-content`), início na largura útil do display (`100cqw`), fim após sair todo o texto (`-100%`). Duração do Flutter: `8000 + tamanho × 280` ms; recorte e redução de movimento preservados. |
| Mensagem | Sanitização central já implementada. | Preservada, sem cópia de algoritmo. Mensagem salva atualiza Pesagem sem reload. Fonte existente `DS-Digital.woff2` reutilizada, sem novo asset. |
| Inversão | Associação por equipamento e validação de duplicidade já existiam. | Mantidas e testadas: troca IDs, não posições de Entrada/Saída; botão indisponível apenas com cancelas desligadas ou falta de autorização. |
| Cadastros / Relatórios | Não foi reproduzida rota quebrada ou overlay com Administrador. `[disabled]` tornava o menu inerte em perfis sem `readRegistry` / `readReports`. | Menu agora navega também no perfil restrito, mas a área explica “Acesso restrito” e não renderiza dados ou ações. Autorizações de consulta e serviços preservadas. Diferença intencional em relação ao menu inerte do Flutter, conforme pedido desta rodada. |
| Abas | Sete abas de Cadastros e nove opções de Relatórios já possuíam handlers. | Mantidas, agora cobertas por testes de clique, conteúdo, título/filtros e seleção ativa. Não foram reimplementadas sem necessidade. |
| Ícone Pesagem | Mesmo container, porém desenho horizontal no `viewBox` 512 × 360 tinha menor altura percebida. | Compensação uniforme de escala 1,25, sem distorcer ou alterar o SVG. Container compartilhado de 34 px (28 px no modo estreito), centralizado e `flex-shrink: 0`. |

“Aplicar contexto” permanece como ação explícita opcional; não é requisito para ativar uma seleção válida. A troca de contexto descarta rascunhos não salvos, conforme aviso do formulário. Configurações são temporárias nesta sessão, não persistência remota.

## Validação

- Testes de regressão existentes preservados, incluindo Pesagem, atalhos, permissões, impressão, tickets e indicadores.
- Novos testes: bindings reais dos selects, seleção única, contexto pendente, isolamento por estação, larguras dos campos, SGV e dispositivos independentes, atualização/sanitização da mensagem, percurso completo de texto longo, geometria das cancelas/semáforos, cinco menus, perfis restritos e todas as abas.
- `scripts/manual-review.mjs` usa cliques de ponteiro pelo Chrome DevTools Protocol, com `elementFromPoint` para detectar botões encobertos. Não se limita a chamar `.click()` no DOM.
- Capturas e medições em `docs/qa-correcoes`, nas resoluções 1920 × 1080, 1600 × 900 e 1366 × 768. Incluem as cinco rotas, Gestão de Veículos e cancelas abertas.

Resultado final: **84 testes passaram**, incluindo 12 novos; **build de produção passou**; **38 verificações no Chrome**, 18 capturas e **zero erros de runtime capturados**. Sem overflow horizontal nas cinco rotas; barra de ações da Pesagem dentro da viewport nas três resoluções. Evidências: [runtime.json](qa-correcoes/runtime.json) e [validation.json](qa-correcoes/validation.json).

Permanecem quatro avisos de orçamento de CSS (sem erro): App 4,31 kB, Configurações 5,51 kB, workbench 4,73 kB, Pesagem 7,46 kB. Os limites não foram aumentados. Não existe script de lint no `package.json`.

## Limites preservados

Equipamentos e diretório continuam mocks explícitos. Nenhuma comunicação COM, TCP bruta, impressora nativa, Oracle ou endpoint novo. Fonte operacional do piloto permanece `GET /api/v1/pre-tickets`. Não foram alteradas regras de Pesagem, Peso Manual, tickets, matriz de permissões ou persistência corporativa.

## Arquivos desta rodada

- `src/app/app.html`, `src/app/app.css`
- `src/app/core/state/station-settings.service.ts`
- `src/app/pages/configuracoes/configuracoes.ts`, `.html`, `.css`, `.spec.ts`
- `src/app/pages/pesagem/pesagem.ts`, `.html`, `.css`
- `src/app/shared/components/gate-scene.ts`, `.css`
- `src/app/shared/components/information-display.ts`, `.css` (novos)
- `src/app/shared/components/corrections.spec.ts` (novo)
- `scripts/manual-review.mjs`
- Este documento, `docs/migracao-flutter-angular.md` e evidências em `docs/qa-correcoes/`.

Os demais arquivos já modificados no workspace pertencem às rodadas anteriores e foram preservados.
