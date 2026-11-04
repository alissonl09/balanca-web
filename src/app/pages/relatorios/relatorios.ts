import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/state/report.service';
import { PermissionService } from '../../core/state/permission.service';
import { filterLabels, reportCatalog, ReportFilters } from '../../core/models/reports';
@Component({selector:'app-relatorios',standalone:true,imports:[FormsModule],templateUrl:'./relatorios.html',styleUrl:'../../shared/styles/workbench.css'})
export class Relatorios {
  readonly service=inject(ReportService);readonly auth=inject(PermissionService);readonly catalog=reportCatalog;readonly labels=filterLabels;
  message='';preview=false;
  get definition(){return this.catalog.find(r=>r.id===this.service.selected)!;}
  get filters():ReportFilters{return this.service.drafts[this.service.selected]??={};}
  get rows(){return this.service.results[this.service.selected]??[];}
  get columns(){return [...new Set(this.rows.flatMap(r=>Object.keys(r)))];}
  columnLabel(key:string):string{return ({date:'Data',first:'Peso 1 (kg)',second:'Peso 2 (kg)',code:'Código',...filterLabels} as Record<string,string>)[key]??key;}
  select(id:string):void{this.service.selected=id;this.message='';}
  generate():void{try{this.service.generate(this.service.selected,this.filters);this.message=`${this.rows.length} registro(s) em dados mock.`;}catch(e){this.message=(e as Error).message;}}
  clear():void{this.service.drafts[this.service.selected]={};delete this.service.results[this.service.selected];this.message='';}
  export():void{try{const csv=this.service.csv(this.rows);const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${this.service.selected}-mock.csv`;a.click();URL.revokeObjectURL(url);this.message='CSV local exportado.';}catch(e){this.message=(e as Error).message;}}
  printPreview():void{if(this.auth.can('printReports'))this.preview=true;}
}
