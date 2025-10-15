function DispatcherDashboard() {
  return (
    <div className="container-fluid">
      <h4 className="mb-3">Resumen del Despachador</h4>
      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header">Rutas activas</div>
            <div className="card-body">
              <div className="display-6">12</div>
              <div className="text-muted">rutas en operación</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header">Buses en línea</div>
            <div className="card-body">
              <div className="display-6">38</div>
              <div className="text-muted">en tiempo real</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header">Paraderos</div>
            <div className="card-body">
              <div className="display-6">214</div>
              <div className="text-muted">registrados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DispatcherDashboard
