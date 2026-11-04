import { Injectable, computed, signal } from '@angular/core';

export const permissionLabels = {
  weigh: 'Realizar pesagem', useManual: 'Utilizar Peso Manual', authorizeManual: 'Autorizar Peso Manual',
  editOpen: 'Editar dados manuais de pesagem aberta', releaseDivergence: 'Liberar divergência/tolerância',
  reweigh: 'Corrigir/reprocessar', cancelOperation: 'Cancelar operação (futuro)',
  printTicket: 'Imprimir ticket', reprintTicket: 'Reimprimir ticket', cancelTicket: 'Cancelar ticket',
  readRegistry: 'Consultar cadastros', insertRegistry: 'Inserir cadastros', editRegistry: 'Alterar cadastros', deactivateRegistry: 'Inativar cadastro',
  readReports: 'Consultar relatórios', printReports: 'Imprimir relatórios', exportReports: 'Exportar relatórios',
  generalSettings: 'Configurações Gerais', vehicleSettings: 'Gestão de Veículos', printSettings: 'Impressão',
  indicators: 'Indicadores', indicatorModels: 'Modelos de Indicadores', permissions: 'Permissões',
  readUsers: 'Consultar usuários', assignProfile: 'Atribuir perfil', manageProfiles: 'Administrar perfis'
};
export type Permission = keyof typeof permissionLabels;
export interface Profile { code: number; name: string; grants: Permission[]; }
export interface DirectoryUser { id: string; name: string; registration: string; profile: number; }
/** Diretório mock sem senhas. Futuro adapter de identidade/AD deve substituir este catálogo. */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly profileState = signal<Profile[]>([
    { code: 0, name: 'Master', grants: Object.keys(permissionLabels) as Permission[] },
    { code: 1, name: 'Administrador', grants: Object.keys(permissionLabels) as Permission[] },
    { code: 2, name: 'Supervisor de Balança', grants: ['weigh','useManual','authorizeManual','cancelTicket','releaseDivergence','reprintTicket','editOpen'] },
    { code: 3, name: 'Líder de Operação', grants: ['weigh','releaseDivergence','reprintTicket'] },
    { code: 4, name: 'Operador', grants: ['weigh','reprintTicket'] }
  ]);
  readonly profiles = this.profileState.asReadonly();
  private readonly userState = signal<DirectoryUser[]>([
    { id: 'master', name: 'Configuração inicial (mock)', registration: 'LOCAL', profile: 0 },
    { id: 'alisson', name: 'Alisson Romano', registration: '00001', profile: 1 },
    { id: 'demo', name: 'Autorizador demonstração', registration: 'MOCK', profile: 2 },
    { id: 'carlos', name: 'CARLOS ALMEIDA', registration: '12345', profile: 4 }
  ]);
  readonly users = this.userState.asReadonly();
  private readonly currentId = signal('alisson');
  readonly current = computed(() => this.users().find(u => u.id === this.currentId())!);
  can(permission: Permission): boolean { return this.userCan(this.currentId(), permission); }
  canWeighAction(action: string): boolean {
    if (action === 'imprimir') return this.can('printTicket') || this.can('reprintTicket');
    if (action === 'salvar') return this.can('editOpen');
    if (action === 'manual') return this.can('weigh') && this.can('useManual');
    return this.can('weigh');
  }
  userCan(id: string, permission: Permission): boolean {
    const user = this.users().find(u => u.id === id);
    const profile = this.profiles().find(p => p.code === user?.profile);
    return !!profile && (profile.code === 0 || profile.grants.includes(permission));
  }
  selectDemoUser(id: string): void {
    if (!this.users().some(u => u.id === id)) throw new Error('Usuário mock inexistente.');
    this.currentId.set(id);
  }
  setGrant(code: number, permission: Permission, value: boolean): void {
    if (!this.can('manageProfiles') || code === 0) throw new Error('Alteração de perfil não autorizada.');
    this.profileState.update(rows => rows.map(p => p.code !== code ? p : { ...p,
      grants: value ? [...new Set([...p.grants, permission])] : p.grants.filter(g => g !== permission) }));
  }
  assign(id: string, profile: number): void {
    if (!this.can('assignProfile') || !this.profiles().some(p => p.code === profile)) throw new Error('Atribuição não autorizada.');
    this.userState.update(rows => rows.map(u => u.id === id ? { ...u, profile } : u));
  }
  search(query: string): DirectoryUser[] {
    if (!this.can('readUsers')) return [];
    return this.users().filter(u => `${u.name} ${u.registration}`.toLowerCase().includes(query.toLowerCase().trim()));
  }
}
