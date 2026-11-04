import { Component, Input } from '@angular/core';
/** Cena visual sem comandos ou estado próprio. Medidas de GateVisual/TrafficLightVisual do Flutter. */
@Component({selector:'app-gate-scene',standalone:true,template:`<div class="lane" [class.exit]="side === 'saida'" [class.lights-only]="!gates">
@if(gates){<div class="gate-visuals"><div class="gate" [class.error]="state === 'erro'" [class.moving]="state === 'movendo'" [class.open]="state === 'aberta'"><span></span><i class="gate-motor"></i></div></div>}
@if(lights){<div class="traffic-light" [attr.aria-label]="'Semáforo ' + side"><span class="red" [class.on]="state !== 'aberta'"></span><span class="green" [class.on]="state === 'aberta'"></span></div>}
</div>`,styleUrl:'./gate-scene.css'})
export class GateSceneComponent {
  @Input() side='entrada'; @Input() state='fechada'; @Input() gates=false; @Input() lights=false;
}
