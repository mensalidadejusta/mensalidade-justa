"use client";

export default function BuscaPage() {
  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2 pt-4">
        <h1 className="text-2xl font-bold">Mensalidade Justa</h1>
        <p className="text-sm text-gray-500">
          Encontre escolas e compare mensalidades com transparência.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="relative">
          <input
            className="input-field pl-10"
            placeholder="Buscar escola por nome, cidade ou UF..."
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select className="input-field flex-1 min-w-0 text-sm">
            <option value="">UF</option>
          </select>
          <select className="input-field flex-1 min-w-0 text-sm">
            <option value="">Município</option>
          </select>
        </div>

        <button className="btn-primary">Buscar</button>
      </div>

      <div className="text-center py-12 text-gray-400 text-sm">
        Use os filtros acima para começar a busca.
      </div>
    </div>
  );
}
