export const registryKinds = {
  remetentes: 'Remetentes / Destinatários', transportadoras: 'Transportadoras', motoristas: 'Motoristas',
  placas: 'Placas', operacoes: 'Operações', itens: 'Itens / Produtos', unidades: 'Unidades'
};
export type RegistryKind = keyof typeof registryKinds;
/** Modelo de apresentação local, sem presumir DTO corporativo. */
export interface RegistryRecord {
  code: number; name: string; active: boolean; personType: string; driverLink: string;
  carrierCode: number | null; plate: string; vehicleType: 'Cavalo' | 'Carreta';
  address: string; number: string; complement: string; city: string; uf: string; postalCode: string;
  taxId: string; stateRegistration: string; enrollment: string; observation: string;
}
export function emptyRecord(): RegistryRecord {
  return { code: 0, name: '', active: true, personType: '', driverLink: '', carrierCode: null,
    plate: '', vehicleType: 'Cavalo', address: '', number: '', complement: '', city: '', uf: '', postalCode: '',
    taxId: '', stateRegistration: '', enrollment: '', observation: '' };
}
