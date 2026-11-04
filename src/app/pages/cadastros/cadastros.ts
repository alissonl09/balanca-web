import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegistryKind, RegistryRecord, emptyRecord, registryKinds } from '../../core/models/registry';
import { RegistryService } from '../../core/state/registry.service';
import { PermissionService } from '../../core/state/permission.service';

@Component({ selector:'app-cadastros',standalone:true,imports:[FormsModule],templateUrl:'./cadastros.html',styleUrl:'../../shared/styles/workbench.css' })
export class Cadastros {
  readonly service = inject(RegistryService); readonly auth = inject(PermissionService);
  readonly kinds = Object.entries(registryKinds) as [RegistryKind,string][];
  kind: RegistryKind = 'remetentes'; query=''; inactive=false; message='';
  draft: RegistryRecord | null = null; existingCode: number | null = null; view=false; toDeactivate: RegistryRecord | null = null;
  readonly commonFields: [keyof RegistryRecord,string][] = [['name','Nome *'],['address','Endereço'],['number','Número'],['complement','Complemento'],['city','Cidade'],['uf','UF'],['postalCode','CEP'],['taxId','CNPJ/CPF'],['stateRegistration','IE'],['enrollment','Matrícula'],['observation','Observação']];
  get rows() { return this.service.list(this.kind,this.query,this.inactive); }
  select(kind: RegistryKind): void { this.kind=kind;this.query='';this.message='';this.draft=null; }
  open(record?: RegistryRecord,view=false): void {
    if(!this.auth.can(record ? (view?'readRegistry':'editRegistry') : 'insertRegistry')) return;
    this.existingCode=record?.code??null;this.draft=record?structuredClone(record):emptyRecord();this.view=view;this.message='';
  }
  save(): void { try { if(this.draft){this.service.save(this.kind,this.draft,this.existingCode);this.draft=null;this.message='Cadastro salvo somente em memória.';} }catch(e){this.message=(e as Error).message;} }
  deactivate(): void { try { if(this.toDeactivate)this.service.deactivate(this.kind,this.toDeactivate.code);this.toDeactivate=null;this.message='Registro inativado. Histórico preservado no mock.';}catch(e){this.message=(e as Error).message;} }
}
