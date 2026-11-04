# Fidelidade visual — Flutter → Angular

Esta rodada altera somente apresentação, templates e testes de renderização. Não altera serviços, mocks, APIs, permissões, regras de habilitação, captura, persistência ou fluxos operacionais. O controlador Pesagem recebeu somente imports de componentes visuais.

## Referência usada
Leitura das capturas existentes em balanca_desktop/build/legibility_preview, responsive_preview, visual_preview e tickets, juntamente com os fontes atuais PesagemLayout, PesagemActionBar, WeightPanels, PesagemPage, PesagemSidePanel, AccessControlPanel, AppShell, AppTheme, VisualField, SettingsWidgets, Cadastros/Relatórios e ThermalTicket/A4Ticket. As capturas antigas mostram F2/F7 e agrupamentos antigos: nesses casos o código Flutter atual prevaleceu. F2 não foi recriado, Salvar continua F10 e as ações continuam na barra inferior. Não foi executado nem alterado o Flutter.

## Comparação e ajustes
| Componente | Diferença encontrada | Aproximação ao Flutter atual |
|---|---|---|
| Ações | botões verdes genéricos, sem ícones e badges pequenos | impressão/salvar ilustrados, adicionar vetorial, caminhões verde/branco/vermelho, secundários brancos, manual vermelho, Pesagem verde; radius 8 e badges 11px |
| Ícones | glifos de texto no menu e seta; dimensões inconsistentes | vetores locais, menu 34px, ações 26px (ilustrados 30px), busca/ações secundárias 20px; caixas e máximos explícitos |
| Header/menu | avatar sem caixa fixa, seleção preta, menu sem ícones/header/divisor | avatar 42px, marca 58/50px, menu 124px, itens 78px, espaçamento 16/12px, popup 250px com avatar/header/divisor e ícones |
| Título | título sem ícone/bloco pálido | PageHeading com ícone 44px, título Arial 28px, subtítulo 13px e número à direita |
| Consulta/composição | campos esticados e botão retangular genérico | Placa/Carreta 190px, busca/limpar como sufixo 20px, divisória vertical e seções 18px |
| Operação | três colunas iguais, labels de 11px, altura 28px no compacto | agrupamentos 2/2/3/4 do Flutter; NF 120px, proporções 10/12/18 na terceira linha; labels 14px semibold e todos os inputs iguais a Placa/Carreta |
| Indicador | número pequeno e centralizado | painel 4:6 com resumo, visor 88/100/122px, dígitos 64/80px à direita, unidade 18px e status inferior com ponto luminoso |
| Resumo | cards genéricos, fontes e unidades pequenas | quatro cores/bordas da referência, radius 9px, unidade junto ao valor, altura igual à do visor |
| Veículos | título sem ícone/badge, lista sem cabeçalho e busca crua | ícone 23px, badge 27px, abas 34px, busca 190px com lupa, linhas 30/34/39px e espaço de cinco linhas. Horários não existentes no mock continuam como —; nenhum dado foi inventado |
| Controle de acesso | haste de 80px alta, base como linha e semáforos deslocados | cena 100×70px, haste 50×5px com pivô, motor 18×19px, saída espelhada, semáforo vertical com lâmpadas de 11px junto à base |
| Display | tipografia fina e card genérico | fundo #15191c/radius 5, digital vermelha 30px com peso/sombra e recorte; mesma mensagem e sanitização existentes |
| Configurações | campos e selects visualmente crus; booleanos em dropdowns | mesma vinculação booleana apresentada como switch, seções de Manual/SGV, duas colunas, inversão junto à configuração da cancela, títulos/paddings/radius e ícones |
| Cadastros/relatórios | cabeçalhos sem ícones, botões textuais, tabelas secas | PageHeading equivalente, ícones secundários, labels/campos consistentes, tabelas/hover e abas sublinhadas; catálogo em três colunas e cards 144px como RelatoriosPage |
| Tickets | monospace genérica, logo/número desalinhados, campos corridos | Arial 13px/1.3 no térmico e 14px/1.35 no A4, marca e número lado a lado, labels 11px acima dos valores, seções/separadores e duas colunas no A4; mesmos dados e histórico |

## Tokens e assets
Tokens em src/styles.css: cores, readonly, texto auxiliar, alturas de controle/ação/visor, espaçamento/padding, radius, sombra e tamanhos de ícones. Controles usam 34px no compacto, 36px intermediário e 40px no amplo, sempre com texto 14px, padding horizontal 12px, borda 1px e radius 7px. Hover/focus/pressed são discretos; disabled mantém legibilidade sem opacity .45.

Os sete SVGs do Flutter já existem idênticos no Angular: balanca_icon, config, imprimir-pesagem, logo-topo, resumo_pesagem, salvar-pesagem e truck. Hashes comparados em qa-visual/assets.json. Nenhum SVG foi alterado no Flutter, rasterizado ou copiado redundantemente; DS-Digital existente foi preservada. ui-icons.svg reúne equivalentes vetoriais de ícones Material para busca, limpar, adicionar, cadastros, relatórios, usuário, navegação e ações secundárias. Sem pacote/fontes de ícones externos.

PageHeading, WeightPanels, WeighingActions e GateScene são componentes exclusivamente de apresentação. Recebem valores e habilitação já existentes; a barra somente encaminha o clique ao mesmo runAction. Essa separação mantém os estilos locais dentro do budget, sem elevar limites de build nem criar estado paralelo.

## Arquivos
- Apresentação: src/styles.css; app.html/css; pages/pesagem/pesagem.html/css e imports em pesagem.ts; pages/configuracoes/configuracoes.html/css; pages/cadastros/cadastros.html; pages/relatorios/relatorios.html; pages/tickets/tickets.html; shared/styles/workbench.css; shared/components/print-preview.ts e ticket-document.ts.
- Novos blocos visuais: shared/components/page-heading.ts, weight-panels.ts/css, weighing-actions.ts/css, gate-scene.ts/css.
- Assets/testes/evidências: public/images/ui-icons.svg; shared/components/visual.spec.ts; scripts/manual-review.mjs (seletores adaptados à estrutura visual, saída configurável por QA_OUTPUT); docs/qa-visual e este documento.

## Validação
- Build de produção Angular passou. Permanecem avisos CSS acima de 4kB em alguns componentes; todos abaixo do limite de erro de 8kB. Budget não alterado.
- 72 testes passaram: 68 funcionais preservados + quatro testes de ícones/estrutura, alturas iguais e cena visual das cancelas.
- Chrome de produção: 15 capturas nas resoluções 1920×1080, 1600×900 e 1366×768; oito verificações funcionais adicionais; zero erros de runtime; sem overflow horizontal; cinco ações dentro da viewport.
- Capturas em qa-visual; comparação anterior em qa-final. Configurações/relatórios extensos mantêm scroll vertical normal, e controles auxiliares de mock continuam disponíveis.
- Sem lint configurado. Nenhum commit/push. Nenhum arquivo Flutter/backend/Libra ou de diretórios irmãos foi alterado.

O resultado aproxima as medidas e a identidade visual da referência. Não se declara correspondência pixel a pixel entre motores de renderização; estados, dados e avisos específicos da alternativa web foram preservados.
