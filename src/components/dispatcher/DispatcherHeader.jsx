import { FaTools } from 'react-icons/fa'

function DispatcherHeader() {
  
  return (
    <header className="border-0" style={{ background: 'linear-gradient(90deg, #ffe8a8, #ffc27a)' }}>
      <div className="container-fluid py-2 d-flex align-items-center justify-content-between">
        <h6 className="m-0 d-flex align-items-center gap-2">
          <button 
            className="btn btn-light btn-sm d-md-none" 
            type="button" 
            data-bs-toggle="offcanvas" 
            data-bs-target="#dispatcherSidebarOffcanvas" 
            aria-controls="dispatcherSidebarOffcanvas"
          >
            ☰
          </button>
          <span className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-pill" style={{ backgroundColor: 'rgba(255,255,255,.9)', color: '#333' }}>
            <FaTools />
            <strong>Panel de Despachador</strong>
          </span>
        </h6>
        <div />
      </div>
    </header>
  )
}

export default DispatcherHeader
