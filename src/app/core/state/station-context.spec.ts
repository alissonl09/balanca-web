import { StationContext } from './station-context';
describe('StationContext', () => {
  const unit = { id: 'u1', codigo: 1, descricao: 'Unidade' };
  const station = { id: 's1', unidadeId: 'u1', codigo: 'A', descricao: 'A', ativo: true };
  it('starts without a global station', () => expect(new StationContext().contexto()).toBeNull());
  it('rejects a station from another unit', () => {
    const state = new StationContext();
    expect(() => state.selecionar({ unidade: unit, estacao: { ...station, unidadeId: 'u2' } })).toThrow();
    expect(state.contexto()).toBeNull();
  });
  it('supports changing stations within a unit without mutating input', () => {
    const state = new StationContext();
    state.selecionar({ unidade: unit, estacao: station });
    state.selecionar({ unidade: unit, estacao: { ...station, id: 's2' } });
    expect(state.contexto()?.estacao.id).toBe('s2');
    expect(station.id).toBe('s1');
    state.limpar(); expect(state.contexto()).toBeNull();
  });
});
