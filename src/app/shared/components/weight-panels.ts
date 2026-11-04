import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeituraEstacao } from '../../core/models/station';
/** Somente apresenta??o: recebe a leitura e o resumo, sem capturar/calcular pesos. */
@Component({selector:'app-weight-panels',standalone:true,imports:[CommonModule],template:`    <section class="weighing-area"><div class="section"><h2><span class="asset-icon" style="--asset:url(/images/balanca_icon.svg)" aria-hidden="true"></span>Indicador de Peso</h2><div class="digital-display"><strong>{{ (reading.conectado ? reading.peso : 0) | number:'1.0-3':'pt-BR' }}</strong><span>{{ reading.unidade }}</span><small><i class="reading-dot" [class.connected]="reading.conectado"></i>{{ reading.conectado ? 'Conectado' : 'Desconectado' }} · {{ reading.estavel ? 'Estável' : 'Sem estabilidade' }}</small></div><small class="reading-details">{{ reading.erro }} · Última leitura: {{ reading.dataHoraLeitura ?? '—' }}</small></div>
    <div class="section"><h2>Resumo da Pesagem</h2><div class="summary-grid">
      <div><span>Pesagem 1</span><div class="summary-value"><strong>{{ summary.first | number:'1.0-3':'pt-BR' }}</strong><small>Kg</small></div></div>
      <div><span>Pesagem 2</span><div class="summary-value"><strong>{{ summary.second | number:'1.0-3':'pt-BR' }}</strong><small>Kg</small></div></div>
      <div><span>Peso Líquido</span><div class="summary-value"><strong>{{ summary.net | number:'1.0-3':'pt-BR' }}</strong><small>Kg</small></div></div>
      <div><span>Peso Seco</span><div class="summary-value"><strong>{{ summary.dry | number:'1.0-3':'pt-BR' }}</strong><small>Kg</small></div></div>
    </div></div></section>
`,styleUrl:'./weight-panels.css'})
export class WeightPanelsComponent {
  @Input({required:true}) reading!: LeituraEstacao;
  @Input({required:true}) summary!: {first:number;second:number;net:number;dry:number};
}
