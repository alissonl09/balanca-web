import { Component, Input } from '@angular/core';

/** Apresentação somente: recebe o texto normalizado pelo estado da estação. */
@Component({
  selector: 'app-information-display', standalone: true,
  template: `<div class="access-display" aria-label="Display digital"><span [style.animation-duration.ms]="8000 + message.length * 280">{{ message }}</span></div>`,
  styleUrl: './information-display.css'
})
export class InformationDisplayComponent {
  @Input() message = 'COOXUPE';
}
