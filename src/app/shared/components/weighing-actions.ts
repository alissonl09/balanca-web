import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { Action } from '../../pages/pesagem/pesagem-state';
/** Apresenta??o da barra: habilita??o e execu??o continuam na Pesagem. */
@Component({selector:'app-weighing-actions',standalone:true,template:`    <div class="action-bar">@for (action of actions; track action.id) { <button [attr.data-action]="action.id" [disabled]="disabled[action.id]" (click)="invoke.emit(action.id)"><span class="action-icon" aria-hidden="true">@switch(action.id){
@case('imprimir'){<img src="/images/imprimir-pesagem.svg" alt=""/>}
@case('salvar'){<img src="/images/salvar-pesagem.svg" alt=""/>}
@case('nova'){<svg class="ui-icon"><use href="/images/ui-icons.svg#plus"/></svg>}
@default{<span class="asset-icon" style="--asset:url(/images/truck.svg)"></span>}
}</span><span class="action-label">{{ action.label }}</span><kbd>{{ action.key }}</kbd></button> }</div>
`,styleUrl:'./weighing-actions.css'})
export class WeighingActionsComponent {
 @Input({required:true}) actions!:readonly {id:Action;label:string;key:string}[];
 @Input({required:true}) disabled!:Record<Action,boolean>;
 @Output() invoke=new EventEmitter<Action>();
}
