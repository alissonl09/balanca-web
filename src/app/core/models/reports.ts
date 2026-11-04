export const filterLabels={startDate:'Data inicial',endDate:'Data final',plate:'Placa',trailer:'Carreta',driver:'Motorista',carrier:'Transportadora',party:'Remetente / Destinatário',product:'Item / Produto',unit:'Unidade',operation:'Operação',documentType:'Tipo do documento',status:'Status',manual:'Pesagem manual',divergence:'Divergência',operator:'Operador',ticketNumber:'Número do ticket',weighingNumber:'Número da pesagem',ticketType:'Tipo',document:'Documento',issuer:'Emissor',name:'Nome / Descrição'};
export type FilterKey=keyof typeof filterLabels;
export type ReportFilters=Partial<Record<FilterKey,string>>;
export type ReportRow=Record<string,string>;
export const reportCatalog:{id:string;title:string;filters:FilterKey[]}[]=[
  {id:'pesagens',title:'Relatório de Pesagens',filters:['startDate','endDate','plate','trailer','driver','carrier','party','product','unit','operation','documentType','status','manual','divergence','operator']},
  {id:'tickets',title:'Relatório de Tickets',filters:['ticketNumber','weighingNumber','plate','startDate','endDate','ticketType','document','issuer','status']},
  {id:'itens',title:'Relatório de Itens',filters:['product','status']},
  {id:'remetentes',title:'Relatório de Remetentes / Destinatários',filters:['party','status']},
  {id:'transportadoras',title:'Relatório de Transportadoras',filters:['carrier','status']},
  {id:'motoristas',title:'Relatório de Motoristas',filters:['driver','status']},
  {id:'depositos',title:'Relatório de Depósitos',filters:['name','unit','status']},
  {id:'unidades',title:'Relatório de Unidades',filters:['unit','status']},
  {id:'operacoes',title:'Relatório de Operações',filters:['operation','status']}
];
