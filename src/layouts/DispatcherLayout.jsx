import DispatcherSidebar from '../components/dispatcher/DispatcherSidebar'
import DispatcherHeader from '../components/dispatcher/DispatcherHeader'
import { Outlet } from 'react-router-dom'

function DispatcherLayout() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#faf8f3' }}>
      <DispatcherSidebar />
      <div className="flex-grow-1 d-flex flex-column">
        <DispatcherHeader />
        <main className="flex-grow-1 py-3 px-3 px-md-4" style={{ overflowY: 'auto' }}>
          <div className="container-fluid">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DispatcherLayout
