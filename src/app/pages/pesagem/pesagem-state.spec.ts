import { PesagemState } from './pesagem-state';
import { PesagemMocks } from './pesagem-mocks';
describe('PesagemState', () => {
  let state: PesagemState;
  beforeEach(() => state = new PesagemState());
  it('enables save only while open; saving never captures, closes or emits a ticket', () => {
    expect(state.can('salvar', false)).toBeFalse();
    state.confirm(state.preview(1000, { peso: 1000, data: '2026-11-03' }));
    expect(state.phase).toBe('aberta'); expect(state.can('salvar', false)).toBeTrue();
    const capture = state.captures[0]; const confirmed = state.confirmed;
    state.draft['Observação'] = 'Correção'; state.save();
    expect(state.saved['Observação']).toBe('Correção');
    expect(state.first).toBe(1000); expect(state.second).toBe(0);
    expect(state.captures).toEqual([capture]); expect(state.confirmed?.captura).toEqual(confirmed?.captura);
    expect(state.confirmed?.operacao['Observação']).toBe('Correção');
    state.confirm(state.preview(400, { peso: 400, data: '2026-11-04' }));
    expect(state.phase).toBe('fechada'); expect(state.can('salvar', false)).toBeFalse();
    expect(() => state.save()).toThrow(); expect(state.first).toBe(1000); expect(state.second).toBe(400);
    expect(state.net).toBe(0); expect(state.dry).toBe(0);
  });
  it('reset preserves permissions and station configuration', () => {
    state.manualEnabled = true; state.permissions.useManual = false;
    state.integrate({ Motorista: 'Oficial' }, ['abc1d23']); state.reset();
    expect(state.phase).toBe('nova'); expect(state.official).toEqual({}); expect(state.placa).toBe('');
    expect(state.manualEnabled).toBeTrue(); expect(state.permissions.useManual).toBeFalse();
  });
  it('checks communication independently of weight zero', () => {
    expect(state.can('manual', true)).toBeFalse(); expect(state.can('manual', false)).toBeTrue();
    state.manualEnabled = true; expect(state.can('manual', true)).toBeTrue();
    state.permissions.useManual = false; expect(state.can('manual', false)).toBeFalse();
    state.permissions.useManual = true; state.permissions.weigh = false; expect(state.can('manual', false)).toBeFalse();
  });
  it('rejects official edits and keeps first capture unchanged', () => {
    state.integrate({ Motorista: 'Oficial' }, []); state.confirm(state.preview(100, { peso: 100, data: 'now' }));
    state.draft['Motorista'] = 'Alterado'; expect(() => state.save()).toThrow(); expect(state.first).toBe(100);
  });
  it('disconnected preview does not advance or replace a valid capture', () => {
    state.confirm(state.preview(0, null)); expect(state.phase).toBe('nova');
    state.confirm(state.preview(100, { peso: 100, data: 'now', autorizador: 'demo', justificativa: 'Contingência' }));
    const confirmed = state.confirmed; state.confirm(state.preview(0, null));
    expect(state.phase).toBe('aberta'); expect(state.confirmed).toBe(confirmed); expect(state.captures.length).toBe(1);
  });
  it('keeps author and justification for both manual captures', () => {
    for (const peso of [100, 50]) state.confirm(state.preview(peso, { peso, data: 'now', autorizador: 'demo', justificativa: `Leitura ${peso}` }));
    expect(state.captures.map(c => c.justificativa)).toEqual(['Leitura 100', 'Leitura 50']);
  });
});
describe('PesagemMocks', () => {
  it('requires demo authorization, permission and justification', () => {
    const mock = new PesagemMocks();
    expect(mock.authorize('demo','demo','',true)).toBeFalse();
    expect(mock.authorize('demo','wrong','motivo',true)).toBeFalse();
    expect(mock.authorize('demo','demo','motivo',false)).toBeFalse();
    expect(mock.authorize('demo','demo','motivo',true)).toBeTrue();
  });
  it('inversion changes equipment association while keeping equipment state and logical lights', () => {
    const mock = new PesagemMocks(); mock.toggleGate('entrada'); mock.light['entrada'] = true;
    mock.inverted = true;
    expect(mock.equipment('entrada')).toBe('saida'); expect(mock.gates['entrada']).toBe('aberta');
    expect(mock.gates[mock.equipment('saida')]).toBe('aberta'); expect(mock.light['entrada']).toBeTrue();
  });
  it('normalizes display accents and removes unsupported characters', () => {
    const mock = new PesagemMocks(); mock.display = 'COOXUPÉ BALANÇA ☃'; expect(mock.displayText).toBe('COOXUPE BALANCA');
  });
  it('returns optional trailers and no invented operation for unknown plates', () => {
    const mock = new PesagemMocks(); expect(mock.lookup('ZZZ9Z99')).toBeNull();
    expect(mock.lookup('ABC1D23')?.trailers.length).toBe(2);
    expect(mock.vehicles.some(v => v.carreta === null)).toBeTrue();
  });
});
